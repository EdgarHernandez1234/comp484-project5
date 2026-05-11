/* CSUN Map Quiz */

let map;
let guessListener;
let currentQuestion = 0;
let correctTotal = 0;
let startTime;
let timerInterval;

const resultRectangles = [];
const HIGH_SCORE_KEY = "csunMapQuizBestScore";

// Rough CSUN center and restriction bounds.
// Will change after testing in Google Maps.
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

/*
  Each location is an object.
  The bounds create the "correct" rectangle.

  To tune these:
  1. Open the page in Chrome.
  2. Double-click the real location.
  3. Look in the console for the clicked lat/lng.
  4. Adjust north/south/east/west around that point.
*/
const locations = [
  {
    name: "CSUN Bookstore",
    bounds: {
      north: 34.23895,
      south: 34.23820,
      east: -118.52720,
      west: -118.52825
    }
  },
  {
    name: "Jacaranda Hall",
    bounds: {
      north: 34.24245,
      south: 34.24135,
      east: -118.52720,
      west: -118.52910
    }
  },
  {
    name: "Sierra Hall",
    bounds: {
      north: 34.23890,
      south: 34.23785,
      east: -118.52990,
      west: -118.53160
    }
  },
  {
    name: "Citrus Hall",
    bounds: {
      north: 34.24020,
      south: 34.23955,
      east: -118.52560,
      west: -118.52665
    }
  },
  {
    name: "University Library",
    bounds: {
      north: 34.24035,
      south: 34.23925,
      east: -118.52810,
      west: -118.52930
    }
  },
  {
  name: "Chicano House",
  bounds: {
    north: 34.24270,
    south: 34.24205,
    east: -118.52995,
    west: -118.53115
  }
}
];

const elements = {};

function initMap() {
  cacheDomElements();
  loadBestScore();

  map = new google.maps.Map(document.querySelector("#map"), {
    center: CSUN_CENTER,
    zoom: 17,

    // Project requirement: keep panning and zooming functionality off.
    disableDefaultUI: true,
    gestureHandling: "none",
    keyboardShortcuts: false,
    disableDoubleClickZoom: true,
    draggable: false,
    scrollwheel: false,
    clickableIcons: false,

    // Keeps the map focused around CSUN.
    restriction: {
      latLngBounds: CSUN_RESTRICTION,
      strictBounds: true
    }
  });

  elements.newGame.addEventListener("click", resetGame);

  resetGame();
}

function cacheDomElements() {
  elements.question = document.querySelector("#question");
  elements.feedback = document.querySelector("#feedback");
  elements.questionCount = document.querySelector("#question-count");
  elements.score = document.querySelector("#score");
  elements.timer = document.querySelector("#timer");
  elements.bestScore = document.querySelector("#best-score");
  elements.history = document.querySelector("#history");
  elements.newGame = document.querySelector("#new-game");
}

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

function showQuestion() {
  if (currentQuestion >= locations.length) {
    endGame();
    return;
  }

  const location = locations[currentQuestion];

  elements.question.textContent = `Where is ${location.name}?`;
  elements.questionCount.textContent = `${currentQuestion + 1} / ${locations.length}`;
}

function handleMapDoubleClick(event) {
  const clickedPoint = event.latLng;
  const location = locations[currentQuestion];
  const correctBounds = createLatLngBounds(location.bounds);
  const isCorrect = correctBounds.contains(clickedPoint);

  // Helpful while tuning your rectangles.
  console.log("Double-clicked:", {
    lat: clickedPoint.lat(),
    lng: clickedPoint.lng()
  });

  if (isCorrect) {
    correctTotal++;
    elements.feedback.textContent = "Your answer is correct!";
    elements.feedback.className = "feedback correct";
  } else {
    elements.feedback.textContent = `Sorry, wrong location. Correct location: ${location.name}.`;
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

function drawAnswerRectangle(bounds, isCorrect) {
  const rectangleColor = isCorrect ? "#1c9b3b" : "#e21d2f";

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

function clearRectangles() {
  for (let i = 0; i < resultRectangles.length; i++) {
    resultRectangles[i].setMap(null);
  }

  resultRectangles.length = 0;
}

function addHistoryItem(locationName, isCorrect) {
  const item = document.createElement("li");
  const result = document.createElement("span");

  result.className = isCorrect ? "correct-answer" : "wrong-answer";
  result.textContent = isCorrect ? "Correct" : "Incorrect";

  item.append(`${locationName}: `);
  item.append(result);

  elements.history.appendChild(item);
}

function updateStats() {
  elements.score.textContent = correctTotal;
  elements.questionCount.textContent = `${Math.min(currentQuestion + 1, locations.length)} / ${locations.length}`;
}

function startTimer() {
  clearInterval(timerInterval);
  startTime = Date.now();

  timerInterval = setInterval(function () {
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    elements.timer.textContent = `${elapsedSeconds.toFixed(1)}s`;
  }, 100);
}

function endGame() {
  clearInterval(timerInterval);

  if (guessListener) {
    guessListener.remove();
  }

  const finalTime = (Date.now() - startTime) / 1000;

  elements.question.textContent = "Quiz complete!";
  elements.feedback.textContent = `${correctTotal} correct, ${locations.length - correctTotal} incorrect. Time: ${finalTime.toFixed(1)}s.`;
  elements.feedback.className = "feedback finished";
  elements.questionCount.textContent = `${locations.length} / ${locations.length}`;
  elements.newGame.hidden = false;

  saveBestScore(correctTotal, finalTime);
}

function saveBestScore(score, time) {
  const oldBest = getBestScore();

  const newBest =
    !oldBest ||
    score > oldBest.score ||
    (score === oldBest.score && time < oldBest.time);

  if (newBest) {
    const best = {
      score: score,
      time: time
    };

    localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(best));
  }

  loadBestScore();
}

function getBestScore() {
  const saved = localStorage.getItem(HIGH_SCORE_KEY);

  if (!saved) {
    return null;
  }

  return JSON.parse(saved);
}

function loadBestScore() {
  const best = getBestScore();

  if (!best) {
    elements.bestScore.textContent = "No score yet";
    return;
  }

  elements.bestScore.textContent = `${best.score}/${locations.length} in ${best.time.toFixed(1)}s`;
}

// Google Maps callback needs to be global.
window.initMap = initMap;