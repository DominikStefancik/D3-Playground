// We don't need axes and axis labels for a pie chart, that's why margin is not necessary

const WIDTH = 700;
const HEIGHT = 650;
const RADIUS = Math.min(WIDTH, HEIGHT) / 2;
const OUTER_RADIUS = RADIUS - 40;
const LABEL_SQUARE_LENGTH = 20;
const DIRECTION = { LEFT: "LEFT", RIGHT: "RIGHT" };
let slices = 2;
let innerRadius = 0;
let intervalTick = 1000;
let isWheelTurning = false;
let areaValues;
let runningInterval;
let currentDirection;

const svg = d3
  .select("#chart-area")
  .append("svg")
  .attr("width", WIDTH)
  .attr("height", HEIGHT);

const group = svg
  .append("g")
  .attr("transform", `translate(${WIDTH / 2}, ${HEIGHT / 2})`);

const colourScale = d3.scaleOrdinal([
  "#98abc5",
  "#8a89a6",
  "#7b6888",
  "#6b486b",
  "#a05d56",
  "#d0743c",
  "#ff8c00",
  "#ffcB8a",
]);

const arc = d3.arc().outerRadius(OUTER_RADIUS).innerRadius(innerRadius);

const pie = d3
  .pie()
  .sort(null)
  .value((data) => data.value);

const resetInterval = () => {
  clearInterval(runningInterval);
  runningInterval = setInterval(turnWheel, intervalTick);
};

const turnWheel = () => {
  shiftValues();
  updateChart();
};

const shiftValues = () => {
  if (currentDirection === DIRECTION.LEFT) {
    // put the first element at the end of the array
    const firstElement = areaValues.shift();
    areaValues.push(firstElement);
  }

  if (currentDirection === DIRECTION.RIGHT) {
    // put the last element at the beginning of the array
    const lastElement = areaValues.pop();
    areaValues.unshift(lastElement);
  }
};

$("#left-button").on("click", function () {
  currentDirection = DIRECTION.LEFT;
  isWheelTurning = true;
  resetInterval();
});

$("#right-button").on("click", function () {
  currentDirection = DIRECTION.RIGHT;
  isWheelTurning = true;
  resetInterval();
});

$("#stop-button").on("click", function () {
  isWheelTurning = false;
  clearInterval(runningInterval);
});

// initialise sliders
$("#slider-slices").slider({
  min: 2,
  max: 50,
  step: 1,
  // event handler for sliding
  slide: (event, ui) => {
    slices = ui.value;

    $("#slices").text(slices);
    areaValues = getAreaValues();

    updateChart();
  },
});

$("#slider-radius").slider({
  min: 0,
  max: OUTER_RADIUS - 5,
  step: 1,
  // event handler for sliding
  slide: (event, ui) => {
    innerRadius = ui.value;

    $("#innerRadius").text(innerRadius);
    arc.innerRadius(innerRadius);

    updateChart();
  },
});

$("#slider-speed").slider({
  min: 0,
  max: 990,
  step: 10,
  // event handler for sliding
  slide: (event, ui) => {
    intervalTick = 1000 - ui.value;

    $("#speed").text(`${intervalTick} ms`);

    // only reset the interval if the wheel is currently turning, because
    // we don't want slider start the rotation in case the wheel is stopped
    if (isWheelTurning) {
      resetInterval();
    }
  },
});

const getAreaValues = () => {
  const value = 100 / slices;

  // each item of the array will have the same value which represents the value of each pie piece
  return Array(slices)
    .fill(1)
    .map((_, index) => ({
      key: index,
      value,
    }));
};

// we don't really need D3 Update pattern here, because we don't change the size of each slice
// but rather change the number of slices and their positions,
// so what we can do is just to remove all SVG "path" elements which were rendered in a previous cycle
// and then re-render new ones based on the updated "areaValues" array and positions of it's elements
const updateChart = () => {
  d3.selectAll("path").remove();

  group
    .selectAll("path")
    .data(pie(areaValues))
    .enter()
    .append("path")
    .attr("class", "arc")
    .attr("fill", (item) => colourScale(item.data.key))
    .attr("d", arc);
};

areaValues = getAreaValues(slices);
updateChart();
