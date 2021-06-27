import { ReactElement } from "./createElement";

export interface Fiber {
  dom?: HTMLElement | Text;
  element: ReactElement;

  child?: Fiber;
  sibling?: Fiber;
  return?: Fiber;

  alternate?: Fiber;

  effectTag?: EffectTag;
}
const requestIdleCallback = (window as any).requestIdleCallback;
const reservedProps = ["children", "key"];

let nextUnitOfWork: Fiber | undefined;
let wipRoot: Fiber | undefined; // work in progress
let currentRoot: Fiber | undefined;
let deletion: Fiber[] = [];

export function render(element: ReactElement, container: HTMLElement) {
  wipRoot = nextUnitOfWork = {
    dom: container,
    element,
    alternate: currentRoot,
  };

  requestIdleCallback(workLoop);
}

function createDom(fiber: Fiber) {
  const element = fiber.element;
  if (element.type === "TEXT_ELEMENT") {
    return document.createTextNode(element.props.nodeValue);
  }

  // other type
  // create dom
  const dom = document.createElement(element.type);

  // override props
  Object.keys(element.props).forEach((name) => {
    if (!reservedProps.includes(name)) {
      dom.setAttribute(name, element.props[name]);
    }
  });

  return dom;
}

const isEvent = (key: string) => key.startsWith("on");

function updateDom(fiber: Fiber) {
  const dom = fiber.dom;
  if (!dom) return;
  const prevProps = fiber.alternate?.element.props;
  const props = fiber.element.props;

  // unbind
  Object.keys(prevProps || {}).forEach((name) => {
    // event handlers
    if (!reservedProps.includes(name)) {
      if (isEvent(name)) {
        const eventName = name.toLowerCase().slice(2);
        dom.removeEventListener(eventName, prevProps![name]);
      } else Reflect.set(dom, name, "");
    }
  });

  // bind
  Object.keys(props || {}).forEach((name) => {
    if (!reservedProps.includes(name)) {
      if (isEvent(name)) {
        const eventName = name.toLowerCase().slice(2);
        dom.addEventListener(eventName, props[name]);
      } else Reflect.set(dom, name, props[name]);
    }
  });
}

interface IdleDeadline {
  timeRemaining: () => number;
}
function workLoop(deadline: IdleDeadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  } else requestIdleCallback(workLoop);
}

function performUnitOfWork(fiber: Fiber): Fiber | undefined {
  // dom
  if (!fiber.dom) fiber.dom = createDom(fiber);

  // if (fiber.return && fiber.return.dom) fiber.return.dom.appendChild(fiber.dom);
  reconcileChildren(fiber, fiber.element.props.children);

  // return next fiber
  if (fiber.child) return fiber.child;

  let nextFiber: Fiber | undefined = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling;
    nextFiber = nextFiber.return;
  }
}

enum EffectTag {
  PLACEMENT,
  DELETION,
  UPDATE,
}

function reconcileChildren(returnFiber: Fiber, elements: ReactElement[]) {
  let currentFiber = returnFiber.alternate?.child;
  // create all child fiber node
  let prevSiblingFiberNode: Fiber | undefined;
  let index = 0;
  while (index < elements.length || currentFiber) {
    const element = elements[index];

    // compare currentFiber to element (type)
    const isSameType =
      currentFiber && currentFiber.element.type === element.type;

    let childFiberNode: Fiber | undefined;
    // update
    if (isSameType) {
      childFiberNode = {
        dom: currentFiber?.dom,
        element,

        return: returnFiber,
        alternate: currentFiber,
        effectTag: EffectTag.UPDATE,
      };
    }

    // add, add element
    if (element && !isSameType) {
      childFiberNode = {
        element,

        return: returnFiber,
        effectTag: EffectTag.PLACEMENT,
      };
    }

    // deletion, remove currentFiber
    if (currentFiber && !isSameType) {
      currentFiber.effectTag = EffectTag.DELETION;
      deletion.push(currentFiber);
    }

    currentFiber = currentFiber?.sibling;

    if (childFiberNode) {
      if (prevSiblingFiberNode) prevSiblingFiberNode.sibling = childFiberNode;
      else returnFiber.child = childFiberNode;

      prevSiblingFiberNode = childFiberNode;
      childFiberNode.return = returnFiber;
    }

    index++;
  }
}

function commitRoot() {
  deletion.forEach(commitWork);
  if (wipRoot?.child) commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = undefined;
}

function commitWork(fiber: Fiber) {
  if (!fiber) return;
  const parent = fiber.return;

  // append dom into parent container
  if (fiber.effectTag === EffectTag.PLACEMENT && fiber.dom) {
    parent?.dom?.appendChild(fiber.dom);
  } else if (fiber.effectTag === EffectTag.DELETION && fiber.dom) {
    parent?.dom?.removeChild(fiber.dom);
  } else if (fiber.effectTag === EffectTag.UPDATE && fiber.dom) {
    updateDom(fiber);
  }

  if (fiber.child) commitWork(fiber.child);
  if (fiber.sibling) commitWork(fiber.sibling);
}
