/////////////////////////////////////////////////////////////////////////
////////////////////// SETTING UP THE VISUALISATION /////////////////////
/////////////////////////////////////////////////////////////////////////

// We don't need axes and axis labels for a pie chart, that's why margin is not necessary

const WIDTH = 1000;
const HEIGHT = 650;
const RADIUS = Math.min(WIDTH, HEIGHT) / 2;
const OUTER_RADIUS = RADIUS - 40;
const LABEL_SQUARE_LENGTH = 20;
let loadedData;
let innerRadius = 0;
let path;

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

// arc generator, which has to be given outer and inner radius
const arc = d3
  .arc()
  .outerRadius(OUTER_RADIUS)
  // if the inner radius is set to 0, the generator renders a pie chart, otherwise it renders a donut chart
  .innerRadius(innerRadius);

// pie layout
// it expects an array as input, where each item represents a part of the whole data
// "value()" tells the layout where to find the data according to which it creates instructions
// how to generate and arc for this data ("startAngle", "endAngle" and "padAngle")
const pie = d3
  .pie()
  .sort(null)
  .value((data) => data.percentage);

// initialise slider
$("#slider").slider({
  min: 0,
  max: OUTER_RADIUS - 5,
  step: 1,
  // event handler for sliding
  slide: (event, ui) => {
    innerRadius = ui.value;

    $("#innerRadius").text(innerRadius);

    const countryValue = $("#country-select").val();

    updateChart(loadedData[countryValue]);
  },
});

$("#country-select").on("change", function () {
  const value = $(this).val();
  updateChart(loadedData[value]);
});

//////////////////////////////////////////////////////////////////
////////////////////// CREATING SVG ELEMENTS /////////////////////
//////////////////////////////////////////////////////////////////

svg
  .append("text")
  .text("Population:")
  .attr("transform", `translate(20, ${HEIGHT / 2 + 50})`);

const populationText = svg
  .append("text")
  .attr("transform", `translate(20, ${HEIGHT / 2 + 80})`);

const addLegend = (types) => {
  const legendGroup = svg
    .append("g")
    .attr("width", 70)
    .attr("height", HEIGHT)
    .attr("transform", "translate(20, 50)");

  const legendRow = legendGroup
    .selectAll(".legend-row")
    .data(types)
    .enter()
    .append("g")
    .attr("class", "legend-row")
    .attr("height", LABEL_SQUARE_LENGTH)
    .attr(
      "transform",
      (data, index) => `translate(0, ${index * (LABEL_SQUARE_LENGTH + 15)})`
    );

  legendRow
    .append("rect")
    .attr("width", LABEL_SQUARE_LENGTH)
    .attr("height", LABEL_SQUARE_LENGTH)
    .attr("fill", (type) => colourScale(type));

  legendRow
    .append("text")
    .text((type) => type)
    .attr(
      "transform",
      `translate(${LABEL_SQUARE_LENGTH + 10}, ${LABEL_SQUARE_LENGTH - 3})`
    );
};

/////////////////////////////////////////////////////////////////////////////////
////////////////////// HELPER FUNCTION FOR CHART TRANSITION /////////////////////
/////////////////////////////////////////////////////////////////////////////////

// Returns a tween for a transition’s "d" attribute, transitioning any selected
// arcs from their current angle to the specified new angle.
//
// Stores the displayed data in _current.
// Then, interpolates from _current to the new data.
// During the transition, _current is updated in-place by d3.interpolate.
function arcTween(arcData) {
  // To interpolate between the two data objects, we use the default d3.interpolate.
  // The returned function takes a single argument "tick" and returns a number between
  // the starting angle and the ending angle.
  // When tick = 0, it returns "this._current", when tick = 1, it returns "arcData"
  // and for 0 < tick < 1 it returns data in-between.
  const interpolate = d3.interpolate(this._current, arcData);

  // "this" represents the SVG elemnt "path" which is being re-rendered by the transition
  this._current = interpolate(1);

  // Because we used attrTween("d"), the return value of this function will be set to the
  // "d" attribute at every tick.
  // (NOTE: It’s also possible to use transition.tween to run arbitrary code for every tick,
  // say if you want to set multiple attributes from a single function.)
  // The argument tick ranges from 0, at the start of the transition, to 1, at the end.
  return (tick) => {
    // Calculate the current arc angle based on the transition tick (time). Since
    // the tick for the transition and the tick for the interpolate both range from
    // 0 to 1, we can pass it directly to the interpolator.
    //
    // Note that the interpolated angle is written into the element’s bound
    // data object! This is important: it means that if the transition were
    // interrupted, the data bound to the element would still be consistent
    // with its appearance. Whenever we start a new arc transition, the
    // correct starting angle can be inferred from the data.
    const updatedData = interpolate(tick);

    // Lastly, compute the arc path given the updated data! In effect, this
    // transition uses data-space interpolation: the data is interpolated
    // (that is, the end angle) rather than the path string itself.
    // Interpolating the angles in polar coordinates, rather than the raw path
    // string, produces valid intermediate arcs during the transition.
    return arc(updatedData);
  };
}

////////////////////////////////////////////////////////////////////////
////////////////////// RENDERING THE VISUALISATION /////////////////////
////////////////////////////////////////////////////////////////////////

// this function is called once at the very first rendering
const initChart = (selectedCountryData) => {
  path = group
    .selectAll("path")
    // "pie" will create data object for each item from the input array
    // the object contains information about the arc which will be rendered as a path by the "arc" generator
    .data(pie(selectedCountryData.types))
    // loop over the each item from the array (i.e. items generated by the "pie" layout)
    .enter()
    .append("path")
    .attr("class", "arc")
    .attr("fill", (item) => colourScale(item.data.type))
    // generate an arc as a path by the "arc" generator
    .attr("d", arc)
    // when looping over areas, for each of them we store data about itself in the "_current" field
    // this field will then be used for transition between sizes of each area
    .each((arcData) => (arcData._current = arcData));

  populationText.text(selectedCountryData.population);
};

// this function updates areas already created in the "initChart()" function
const updateChart = (selectedCountryData) => {
  // set the transition
  const transition = d3.transition().duration(3000);
  arc.innerRadius(innerRadius);

  // set new data to the path
  path.data(pie(selectedCountryData.types));

  // and then re-render it through a transition by calling "attrTween()"
  path
    .transition(transition)
    // In general, the "attrTween" is a method which we can use on transitions to define a custom interpolator
    // for transitionning any attribute
    // The first argument is an attribute we want to transition (tween) and
    // the second argument is a function which we want to run on every transition's tick and which will update the attribute

    // The return value of the "attrTween" is also a function: the function that
    // we want to run for each tick of the transition.
    //
    // We have to use the reference to a function, in order "this" points to the SVG area element
    // in the "arcTween" function
    .attrTween("d", arcTween);

  populationText.text(selectedCountryData.population);
};

/////////////////////////////////////////////////////////////
////////////////////// LOADING THE DATA /////////////////////
/////////////////////////////////////////////////////////////

(async () => {
  const transformData = (data) => {
    // argument "data" represents a row in the file

    const newData = { types: [] };

    Object.keys(data).forEach((key) => {
      if (key !== "index" && key !== "country" && key !== "population") {
        const text = data[key].replaceAll("%", "");

        // we have to group the properties representing blood types into an array
        // because the "pie" layout expects an array of data representing parts of a whole
        newData.types.push({ type: key, percentage: Number(text) });
      } else {
        newData[key] = data[key];
      }
    });

    return newData;
  };

  // a second argument is a function which does a data transformation after it is loaded
  loadedData = await d3.csv("data/blood_types.csv", transformData);

  const countries = loadedData.map((row) => row.country);
  const bloodTypes = loadedData[0].types.map((item) => item.type);

  // we can set the colour scheme right at the beginning, because the list of blood types is the same for all countries
  colourScale.domain(bloodTypes);

  // populate selectbox with the list of countries
  const select = $("#country-select");
  $.each(countries, (index, country) => {
    select.append(`<option value="${index}">${country}</option>`);
  });

  addLegend(bloodTypes);
  initChart(loadedData[0]);
})();
