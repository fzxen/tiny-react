import { ReactElement } from "./createElement";

const reservedProps = ["children", "key"];

export function render(element: ReactElement, container: HTMLElement) {
  if (element.type === "TEXT_ELEMENT") {
    const dom = document.createTextNode(element.props.nodeValue);
    return container.appendChild(dom);
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

  element.props.children.forEach((child) => {
    render(child, dom);
  });

  container.appendChild(dom);
}
