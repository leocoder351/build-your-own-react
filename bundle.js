let React = {};

function createElement(type, config, ...children) {
  let childrenCount = children.length;
  let props = Object.assign({}, config);

  if (childrenCount === 1) {
    props.children = children[0];
  } else if (childrenCount > 0) {
    props.children = children.slice(0);
  }

  return {
    type,
    props
  };
}

class Component {
  get isReactComponent() {
    console.log('get isReactComponent');
    return true;
  }

}

React.Component = Component;
React.createElement = createElement;

class App extends React.Component {
  render() {
    return /*#__PURE__*/React.createElement(Wrapper, {
      content: "btn"
    });
  }

}

function Wrapper(props) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", null, props.content), /*#__PURE__*/React.createElement("span", null, "hello"));
}

console.log( /*#__PURE__*/React.createElement(App, null));
