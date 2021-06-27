export interface ReactElement {
  type: string;
  props: {
    [prop: string]: any;
    children: Array<ReactElement>;
  };
}

/* 
createElement(
  "ul",
  null,
  React.createElement("li", null, "1"),
  React.createElement("li", null, "2")
)
*/
export function createElement(
  type: string,
  props: ReactElement["props"] | null = null,
  ...children: Array<ReactElement | string>
): ReactElement {
  const element: ReactElement = {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === "object" ? child : createTextElement(child)
      ),
    },
  };
  return element;
}

function createTextElement(text: string): ReactElement {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}
