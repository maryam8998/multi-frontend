import { useState, useEffect } from "react"; 
import "./App.css";
import Square from "./Square/Square";
import { io } from "socket.io-client";
import Swal from "sweetalert2";

const renderFrom = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

const App = () => {
  const [gameState, setGameState] = useState(renderFrom);
  const [currentPlayer, setCurrentPlayer] = useState("circle");
  const [finishedState, setFinishetState] = useState(false);
  const [finishedArrayState, setFinishedArrayState] = useState([]);
  const [playOnline, setPlayOnline] = useState(false);
  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [opponentName, setOpponentName] = useState(null);
  const [playingAs, setPlayingAs] = useState(null);

  // ✅ Winner Check
  const checkWinner = () => {
    // rows
    for (let row = 0; row < 3; row++) {
      if (
        gameState[row][0] === gameState[row][1] &&
        gameState[row][1] === gameState[row][2]
      ) {
        setFinishedArrayState([row * 3, row * 3 + 1, row * 3 + 2]);
        return gameState[row][0];
      }
    }

    // columns
    for (let col = 0; col < 3; col++) {
      if (
        gameState[0][col] === gameState[1][col] &&
        gameState[1][col] === gameState[2][col]
      ) {
        setFinishedArrayState([col, col + 3, col + 6]);
        return gameState[0][col];
      }
    }

    // diagonals
    if (
      gameState[0][0] === gameState[1][1] &&
      gameState[1][1] === gameState[2][2]
    ) {
      setFinishedArrayState([0, 4, 8]);
      return gameState[0][0];
    }

    if (
      gameState[0][2] === gameState[1][1] &&
      gameState[1][1] === gameState[2][0]
    ) {
      setFinishedArrayState([2, 4, 6]);
      return gameState[0][2];
    }

    // draw
    const isDrawMatch = gameState.flat().every((e) => {
      return e === "circle" || e === "cross";
    });

    if (isDrawMatch) return "draw";

    return null;
  };

  // ✅ Check winner on state change
  useEffect(() => {
    const winner = checkWinner();
    if (winner) {
      setFinishetState(winner);
    }
  }, [gameState]);

  // ✅ Socket Events FIXED
  useEffect(() => {
    if (!socket) return;

    socket.on("opponentLeftMatch", () => {
      setFinishetState("opponentLeftMatch");
    });

    socket.on("playerMoveFromServer", (data) => {
      const id = data.state.id;

      setGameState((prevState) => {
        const newState = prevState.map((row) => [...row]); // deep copy
        const rowIndex = Math.floor(id / 3);
        const colIndex = id % 3;

        newState[rowIndex][colIndex] = data.state.sign;
        return newState;
      });

      setCurrentPlayer(data.state.sign === "circle" ? "cross" : "circle");
    });

    socket.on("connect", () => {
      setPlayOnline(true);
    });

    socket.on("OpponentNotFound", () => {
      setOpponentName(false);
    });

    socket.on("OpponentFound", (data) => {
      setPlayingAs(data.playingAs);
      setOpponentName(data.opponentName);
    });

    // cleanup
    return () => {
      socket.off("opponentLeftMatch");
      socket.off("playerMoveFromServer");
      socket.off("connect");
      socket.off("OpponentNotFound");
      socket.off("OpponentFound");
    };
  }, [socket]);

  // ✅ Name input
  const takePlayerName = async () => {
    const result = await Swal.fire({
      title: "Enter your name",
      input: "text",
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return "You need to write something!";
        }
      },
    });

    return result;
  };

  // ✅ Start Online Game
  async function playOnlineClick() {
    const result = await takePlayerName();

    if (!result.isConfirmed) return;

    const username = result.value;
    setPlayerName(username);

    const newSocket = io("http://localhost:3000");
    setSocket(newSocket);

    newSocket.emit("request_to_play", {
      playerName: username,
    });
  }

  // UI STATES
  if (!playOnline) {
    return (
      <div className="main-div">
        <button onClick={playOnlineClick} className="playOnline">
          Play Online
        </button>
      </div>
    );
  }

  if (playOnline && !opponentName) {
    return (
      <div className="waiting">
        <p>Waiting for opponent...</p>
      </div>
    );
  }

  return (
    <div className="main-div">
      <div className="move-detection">
        <div
          className={`left ${
            currentPlayer === playingAs ? "current-move-" + currentPlayer : ""
          }`}
        >
          {playerName}
        </div>

        <div
          className={`right ${
            currentPlayer !== playingAs
              ? "current-move-" + currentPlayer
              : ""
          }`}
        >
          {opponentName}
        </div>
      </div>

      <h1 className="game-heading water-background">Tic Tac Toe</h1>

      <div className="square-wrapper">
        {gameState.map((arr, rowIndex) =>
          arr.map((e, colIndex) => (
            <Square
              socket={socket}
              playingAs={playingAs}
              gameState={gameState}
              finishedArrayState={finishedArrayState}
              finishedState={finishedState}
              currentPlayer={currentPlayer}
              setCurrentPlayer={setCurrentPlayer}
              setGameState={setGameState}
              id={rowIndex * 3 + colIndex}
              key={rowIndex * 3 + colIndex}
              currentElement={e}
            />
          ))
        )}
      </div>

      {/* RESULT */}
      {finishedState &&
        finishedState !== "opponentLeftMatch" &&
        finishedState !== "draw" && (
          <h3 className="finished-state">
            {finishedState === playingAs ? "You " : finishedState} won the game
          </h3>
        )}

      {finishedState === "draw" && (
        <h3 className="finished-state">Its a Draw</h3>
      )}

      {!finishedState && opponentName && (
        <h2>You are playing against {opponentName}</h2>
      )}

      {finishedState === "opponentLeftMatch" && (
        <h2>You won! Opponent left the match</h2>
      )}
    </div>
  );
};

export default App;