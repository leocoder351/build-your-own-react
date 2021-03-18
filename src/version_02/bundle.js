import React from './react.js';
var container = document.getElementById("root");

var updateValue = function updateValue(e) {
  console.log(2222);
  renderer(e.target.value);
};

var renderer = function renderer(value) {
  var element = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("input", {
    onInput: updateValue,
    value: value
  }), /*#__PURE__*/React.createElement("h2", null, "Hello", value));
  React.render(element, container);
};

renderer("World");
