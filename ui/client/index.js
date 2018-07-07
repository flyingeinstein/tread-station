/*
    ./client/index.js
    which is the webpack entry file
*/
import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App.jsx';

if (process.env.NODE_ENV !== 'production') {
    console.log("running in "+process.env.NODE_ENV+" mode");
}

ReactDOM.render(<App />, document.getElementById('root'));

