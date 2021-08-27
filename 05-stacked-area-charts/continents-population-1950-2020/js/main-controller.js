let continentsData;
let stackedAreaChart;
let timeline;
let minYear = 1950;
let maxYear = 2020;

// "%Y" - interpret string as "year"
const parseTime = d3.timeParse("%Y");

const onSlide = (ui) => {
  minYear = ui.values[0];
  maxYear = ui.values[1];

  $("#minYearLabel").text(minYear);
  $("#maxYearLabel").text(maxYear);

  // when moving slider also update the brush size
  // we call the "move" event on the group the brush is attached to
  timeline.brushComponent.call(timeline.brush.move, [
    // we have to pass the set of values which should match the pixel positions the brush selections should run between
    timeline.xScale(parseTime(minYear.toString())),
    timeline.xScale(parseTime(maxYear.toString())),
  ]);

  stackedAreaChart.updateData();
};

const initializeSlider = () => {
  $("#year-slider").slider({
    range: true,
    min: minYear,
    max: maxYear,
    step: 1,
    values: [minYear, maxYear],
    // event handler for sliding
    slide: (event, ui) => onSlide(ui),
  });

  $("#minYearLabel").text(minYear);
  $("#maxYearLabel").text(maxYear);
};

const brushMoveHadler = (event) => {
  // if the "d3.event.selection" is empty, it means a user clicked outside of the brush area
  // then the selection will be the whole xScale
  const selection = event.selection || timeline.xScale.range();
  // "timeline.xScale.invert" returns the year values the selection points to
  const newValues = selection.map(timeline.xScale.invert);
  minYear = newValues[0].getFullYear();
  maxYear = newValues[1].getFullYear();

  $("#year-slider").slider("values", 0, minYear).slider("values", 1, maxYear);
  $("#minYearLabel").text(minYear);
  $("#maxYearLabel").text(maxYear);

  stackedAreaChart.updateData();
};

(async () => {
  const [populationData, continentNames] = await Promise.all([
    d3.csv("data/UN_Population_1950-2020.csv"),
    d3.json("data/continent-code-to-name.json"),
  ]);

  const initPopulation = {};
  Object.keys(continentNames).forEach((key) => {
    initPopulation[key] = 0;
  });

  continentsData = populationData.reduce((previous, current) => {
    const continentCode = current.continent_code;

    Object.keys(current)
      .filter(
        (key) =>
          key !== "continent_code" &&
          key !== "country" &&
          key !== "country_code"
      )
      .forEach((key) => {
        if (previous[key] === undefined) {
          previous[key] = {
            year: parseTime(key),
            world_population: 0,
            ...initPopulation,
          };
        }
        const value = Number(current[key]);
        previous[key].world_population += value;
        previous[key][continentCode] += value;
      });

    return previous;
  }, {});

  // initialize slider at the very beginning
  initializeSlider();

  stackedAreaChart = new StackedAreaChart(
    "#chart-area",
    {
      canvasWidth: 1200,
      canvasHeight: 550,
      margin: { left: 95, right: 100, top: 80, bottom: 70 },
      labelFontSize: 20,
      fontStyle: "Georgia",
    },
    Object.values(continentsData),
    continentNames
  );
  timeline = new Timeline(
    "#timeline-area",
    {
      canvasWidth: 1200,
      canvasHeight: 150,
      margin: { left: 95, right: 100, top: 0, bottom: 20 },
    },
    Object.values(continentsData),
    continentNames
  );
})();
