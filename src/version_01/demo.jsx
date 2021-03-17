import { React, ReactDOM } from './react.js';

class App extends React.Component {
  constructor(props) {
    super(props);
    console.log('<App /> props：', props);
  }

  componentWillMount() {
    console.log('<App /> componentWillMount');
  }

  componentWillUpdate() {
    console.log('<App /> componentWillUpdate');
  }

  componentWillUnmount() {
    console.log('<App /> componentWillUnmount');
  }

  render() {
    return (
      <Header title={this.props.title} />
    )
  }
}

function Header(props) {
  return (
    <div>
      <h2>{props.title}</h2>
      <Content content="this is my react" />
    </div>
  )
}

function Content(props) {
  return (
    <p>{props.content}</p>
  )
}

let rootElem = document.getElementById('app');
ReactDOM.render(<App title="build your own react" />, rootElem);

document.getElementById('mount').addEventListener('click', function() {
  ReactDOM.render(<App title="build your own react" />, rootElem);
});

document.getElementById('unmount').addEventListener('click', () => {
  React.unmountComponentAtNode(rootElem);
});

document.getElementById('update').addEventListener('click', () => {
  ReactDOM.render(<App title="update" />, rootElem);
});


