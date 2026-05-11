// CSUN Map Quiz
// This project uses the Google Maps API for an actual map and  Rectangle objects.
// Assigned Location: Chicano House
// Added a leaderboard that tracks time and number of correct answers, and stores the top 3 scores in localStorage so they persist across page reloads. The leaderboard is displayed on the right side of the page and shows the best score at the top, along with the time it took to achieve that score. The user can click "New Game" to start a new quiz and try to beat their previous best score.

let map;
let guessListener;
let currentQuestion = 0;
let correctTotal = 0;
let startTime;
let timerInterval;

const resultRectangles = []; // Keep track of the rectangles drawn on the map so we can remove them later.
const LEADERBOARD_KEY = "csunMapQuizLeaderboard";

const CSUN_CENTER = {
  lat: 34.2403,
  lng: -118.5288
};

const CSUN_RESTRICTION = {
  north: 34.2468,
  south: 34.2348,
  east: -118.5222,
  west: -118.5365
};

// the rectangle bound answers for each location. 
const locations = [
  {
    name: "Botanic Garden",
    bounds: {
      north: 34.23920,
      south: 34.23870,
      east: -118.52600,
      west: -118.52680
    }
  },
  {
    name: "Jacaranda Hall",
    bounds: {
      north: 34.24200,
      south: 34.24100,
      east: -118.52820,
      west: -118.52950
    }
  },
  {
    name: "Sierra Hall",
    bounds: {
      north: 34.23850,
      south: 34.23785,
      east: -118.52990,
      west: -118.53160
    }
  },
  {
    name: "Chicano House", // The assigned Location I was given 
    bounds: {
      north: 34.24270,
      south: 34.24220,
      east: -118.52920,
      west: -118.52980
    }
  },
  {
    name: "University Library",
    bounds: {
      north: 34.24035,
      south: 34.23925,
      east: -118.52870,
      west: -118.53000
    }
  }
];

// We will cache references to these DOM elements so we don't have to keep querying the document for them.
const elements = {};

// This function is called by the Google Maps API once the map script has loaded. It initializes the map, sets up the event listeners, and starts the first game.
function initMap() {
  cacheDomElements();
  renderLeaderboard();

  map = new google.maps.Map(document.getElementById("map"), {
    center: CSUN_CENTER,
    zoom: 10,
    disableDefaultUI: true, // this turns off the normal google maps UI
    gestureHandling: "none", // This makes it so map doesnt respond to touch gestures
    keyboardShortcuts: false, // This prevents the user from using keyboard shortcuts,
    disableDoubleClickZoom: true, // This allows us to use double-click for making guesses without zooming the map.
    draggable: false, // This prevents the user from dragging the map around
    scrollwheel: false, // This prevents the user from zooming in and out with the scroll wheel
    clickableIcons: false, // This prevents the user from clicking on points of interest on the map
    
    styles: [ // hides labels and points of interest on the map to make it less cluttered and more focused on the quiz locations
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [
      { visibility: "off" }
    ]
  },
  {
    featureType: "transit",
    elementType: "labels",
    stylers: [
      { visibility: "off" }
    ]
  }
],
    restriction: {
      latLngBounds: CSUN_RESTRICTION, // This restricts the map view to the specified bounds, which keeps the quiz focused on the CSUN campus area and prevents the user from getting lost in other parts of the map.
      strictBounds: true // This prevents the user from panning outside the restricted area at all
    }
  });

  elements.newGame.addEventListener("click", resetGame); // This sets up the "New Game" button to call the resetGame function when clicked, allowing the user to start a new quiz after finishing one.

  resetGame(); // This starts the first game immediately when the page loads, so the user can start playing right away without having to click the "New Game" button first.
}

// This function caches references to the important DOM elements that we will be updating throughout the game, such as the question text, feedback box, score display, timer, and history list. By storing these references in the "elements" object, we can easily update their content without having to query the document for them each time.
function cacheDomElements() {
  elements.question = document.querySelector("#question");
  elements.feedback = document.querySelector("#feedback");
  elements.questionCount = document.querySelector("#question-count");
  elements.score = document.querySelector("#score");
  elements.timer = document.querySelector("#timer");
  elements.bestScore = document.querySelector("#best-score");
  elements.history = document.querySelector("#history");
  elements.newGame = document.querySelector("#new-game");
  elements.leaderboardList = document.querySelector("#leaderboard-list");
}

//  This function resets all the game state variables and UI elements to their initial state
function resetGame() {
  currentQuestion = 0;
  correctTotal = 0;

  elements.history.innerHTML = "";
  elements.feedback.textContent = "Double-click the map to make your guess.";
  elements.feedback.className = "feedback";
  elements.newGame.hidden = true;

  clearRectangles();
  updateStats();
  startTimer();
  showQuestion();

  if (guessListener) {
    guessListener.remove();
  }

  guessListener = map.addListener("dblclick", handleMapDoubleClick);
}

// This function updates the question text to ask about the current location and updates the question count display.
function showQuestion() {
  if (currentQuestion >= locations.length) {
    endGame();
    return;
  }

  const location = locations[currentQuestion]; // Get the current location for the question.

  elements.question.textContent = `Where is ${location.name}?`; // Update the question text to ask about the current location.
  elements.questionCount.textContent = `${currentQuestion + 1} / ${locations.length}`; // Update the question count display.
}

// This function is called when the user double-clicks on the map to make a guess.
function handleMapDoubleClick(event) {
  const clickedPoint = event.latLng;
  const location = locations[currentQuestion];
  const correctBounds = createLatLngBounds(location.bounds);
  const isCorrect = correctBounds.contains(clickedPoint);

  console.log("Double-clicked location:", {
    lat: clickedPoint.lat(),
    lng: clickedPoint.lng()
  });

  if (isCorrect) {
    correctTotal++;
    elements.feedback.textContent = "Correct!";
    elements.feedback.className = "feedback correct";
  } else {
    elements.feedback.textContent = `Wrong. The correct area was ${location.name}.`;
    elements.feedback.className = "feedback wrong";
  }

  drawAnswerRectangle(location.bounds, isCorrect);
  addHistoryItem(location.name, isCorrect);

  currentQuestion++;
  updateStats();

  if (currentQuestion >= locations.length) {
    endGame();
  } else {
    showQuestion();
  }
}

// This function converts our simple bounds object into a google.maps.LatLngBounds object that we can use with the Maps API.
function createLatLngBounds(bounds) {
  return new google.maps.LatLngBounds(
    {
      lat: bounds.south,
      lng: bounds.west
    },
    {
      lat: bounds.north,
      lng: bounds.east
    }
  );
}

// This function draws a rectangle on the map to show the correct answer area. It uses a green color for correct answers and red for incorrect answers.
function drawAnswerRectangle(bounds, isCorrect) {
  const rectangleColor = isCorrect ? "#258f38" : "#d92332";

  const rectangle = new google.maps.Rectangle({
    map: map,
    bounds: bounds,
    strokeColor: rectangleColor,
    strokeOpacity: 1,
    strokeWeight: 2,
    fillColor: rectangleColor,
    fillOpacity: 0.28,
    clickable: false
  });

  resultRectangles.push(rectangle);
}

// This function removes all the rectangles that have been drawn on the map so far. We call this at the start of a new game to clear out the old rectangles.
function clearRectangles() {
  for (let i = 0; i < resultRectangles.length; i++) {
    resultRectangles[i].setMap(null);
  }

  resultRectangles.length = 0;
}

// This function adds an item to the history list below the map to show the user which locations they got right and wrong.
function addHistoryItem(locationName, isCorrect) {
  const item = document.createElement("li");
  const result = document.createElement("span");

  result.className = isCorrect ? "correct-answer" : "wrong-answer";
  result.textContent = isCorrect ? "Correct" : "Incorrect";

  item.append(`${locationName}: `);
  item.append(result);

  elements.history.appendChild(item);
}

// This function updates the score and question count display at the top of the page.
function updateStats() {
  elements.score.textContent = correctTotal;

  if (currentQuestion >= locations.length) {
    elements.questionCount.textContent = `${locations.length} / ${locations.length}`;
  } else {
    elements.questionCount.textContent = `${currentQuestion + 1} / ${locations.length}`;
  }
}

// This function starts the timer that counts how long the user takes to complete the quiz. It updates the timer display every 100 milliseconds.
function startTimer() {
  clearInterval(timerInterval);
  startTime = Date.now();

  timerInterval = setInterval(function () {
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    elements.timer.textContent = `${elapsedSeconds.toFixed(1)}s`;
  }, 100);
}

// This function is called when the user has completed all the questions. It stops the timer, removes the guess listener, and shows the final results.
function endGame() {
  clearInterval(timerInterval);

  if (guessListener) {
    guessListener.remove();
  }

  const finalTime = (Date.now() - startTime) / 1000;

  elements.question.textContent = "Quiz complete!";
  elements.feedback.textContent = `${correctTotal} correct out of ${locations.length}. Final time: ${finalTime.toFixed(1)}s.`;
  elements.feedback.className = "feedback finished";
  elements.questionCount.textContent = `${locations.length} / ${locations.length}`;
  elements.newGame.hidden = false;

  saveLeaderboardScore(correctTotal, finalTime);
  renderLeaderboard();

}
function saveLeaderboardScore(score, time) {
  const leaderboard = getLeaderboard();

  leaderboard.push({
    score: score,
    time: time
  });

  leaderboard.sort(function (a, b) {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.time - b.time;
  });

  const topThree = leaderboard.slice(0, 3);

  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(topThree));
}

function getLeaderboard() {
  const saved = localStorage.getItem(LEADERBOARD_KEY);

  if (!saved) {
    return [];
  }

  return JSON.parse(saved);
}

function renderLeaderboard() {
  const leaderboard = getLeaderboard();

  elements.leaderboardList.innerHTML = "";

  for (let i = 0; i < 3; i++) {
    const item = document.createElement("li");

    if (leaderboard[i]) {
      item.innerHTML = `
        <span class="leaderboard-score">${leaderboard[i].score}/${locations.length}</span>
        <span class="leaderboard-time">${leaderboard[i].time.toFixed(1)}s</span>
      `;
    } else {
      item.textContent = "---";
    }

    elements.leaderboardList.appendChild(item);
  }

  updateBestScoreText(leaderboard);
}

function updateBestScoreText(leaderboard) {
  if (!leaderboard.length) {
    elements.bestScore.textContent = "No score yet";
    return;
  }

  const best = leaderboard[0];
  elements.bestScore.textContent = `${best.score}/${locations.length} in ${best.time.toFixed(1)}s`;
}

function getLeaderboard() {
  const saved = localStorage.getItem(LEADERBOARD_KEY);

  if (!saved) {
    return [];
  }

  return JSON.parse(saved);
}

function renderLeaderboard() {
  const leaderboard = getLeaderboard();

  elements.leaderboardList.innerHTML = "";

  for (let i = 0; i < 3; i++) {
    const item = document.createElement("li");

    if (leaderboard[i]) {
      item.innerHTML = `
        <span class="leaderboard-score">${leaderboard[i].score}/${locations.length}</span>
        <span class="leaderboard-time">${leaderboard[i].time.toFixed(1)}s</span>
      `;
    } else {
      item.textContent = "---";
    }

    elements.leaderboardList.appendChild(item);
  }

  updateBestScoreText(leaderboard);
}

function updateBestScoreText(leaderboard) {
  if (!leaderboard.length) {
    elements.bestScore.textContent = "No score yet";
    return;
  }

  const best = leaderboard[0];
  elements.bestScore.textContent = `${best.score}/${locations.length} in ${best.time.toFixed(1)}s`;
}
// Google Maps needs this function to be global because index.html uses callback=initMap.
window.initMap = initMap;