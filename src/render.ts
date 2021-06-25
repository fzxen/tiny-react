import { ReactElement } from "./createElement";

export interface Fiber {
  dom?: HTMLElement | Text;
  element: ReactElement;

  child?: Fiber;
  sibling?: Fiber;
  return?: Fiber;
}
const requestIdleCallback = (window as any).requestIdleCallback;
const reservedProps = ["children", "key"];

let nextUnitOfWork: Fiber | undefined;
let wipRoot: Fiber | null;

export function render(element: ReactElement, container: HTMLElement) {
  wipRoot = nextUnitOfWork = {
    dom: container,
    element,
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

  // create all child fiber node
  let prevSiblingFiberNode: Fiber | null = null;
  fiber.element.props.children.forEach((child) => {
    const childFiberNode: Fiber = { element: child };

    if (prevSiblingFiberNode) prevSiblingFiberNode.sibling = childFiberNode;
    else fiber.child = childFiberNode;

    prevSiblingFiberNode = childFiberNode;
    childFiberNode.return = fiber;
  });

  // return next fiber
  if (fiber.child) return fiber.child;

  let nextFiber: Fiber | undefined = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling;
    nextFiber = nextFiber.return;
  }
}

function commitRoot() {
  if (wipRoot?.child) commitWork(wipRoot?.child);
  wipRoot = null;
}

function commitWork(fiber: Fiber) {
  const parent = fiber.return;

  if (fiber.dom) {
    parent?.dom?.appendChild(fiber.dom);
  }

  if (fiber.child) commitWork(fiber.child);
  if (fiber.sibling) commitWork(fiber.sibling);
}
