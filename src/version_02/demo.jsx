import React from './react.js';

const container = document.getElementById("root");

const updateValue = e => {
  console.log(2222)
  renderer(e.target.value);
};

const renderer = value => {
  const element = (
    <div>
      <input onInput={updateValue} value={value} />
      <h2>Hello{value}</h2>
    </div>
  );
  
  React.render(element, container);
};

renderer("World");


