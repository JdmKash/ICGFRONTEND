import React from "react";
import { Provider } from "react-redux";
import { store } from "./app/store";
import TelegramApp from "./TelegramApp";
import "./index.css";

function App() {
  console.log("Main App component initializing");
  
  return (
    <Provider store={store}>
      <TelegramApp />
    </Provider>
  );
}

export default App;
