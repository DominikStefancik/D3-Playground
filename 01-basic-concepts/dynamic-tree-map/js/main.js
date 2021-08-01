/////////////////////////////////////////////////////////////////////////
////////////////////// SETTING UP THE VISUALISATION /////////////////////
/////////////////////////////////////////////////////////////////////////

// We don't need axes and axis labels for a tree map, that's why margin is not necessary (only for the top label)

const MARGIN_TOP = 100;
const WIDTH = 1200;
const HEIGHT = 750 - MARGIN_TOP;
let loadedData;

const svg = d3
  .select("#treemap-area")
  .append("svg")
  .attr("width", WIDTH)
  .attr("height", HEIGHT + MARGIN_TOP);

const group = svg.append("g").attr("transform", "translate(0,50)");

// scale for colours
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

// scale for fonts
const fontScale = d3.scaleLinear().range([5, 40]);

// treemap layout which expects data in the format of hierarchy
const treemap = d3
  .treemap()
  // "tile()" method sets the algorithm that D3 will use to space out the tiles
  .tile(d3.treemapResquarify)
  .size([WIDTH, HEIGHT])
  // "round()" says that all values should be worked with as Interegers
  .round(true)
  // inner space between tiles
  .paddingInner(1);

$("#country-select").on("change", function () {
  const value = $(this).val();
  updateTreeMap(loadedData[value]);
});

// helper function for getting a rectangle width increased with percentage value
const getRectangleWidth = (data) => data.x1 - data.x0 + data.data.percentage;

//////////////////////////////////////////////////////////////////
////////////////////// CREATING SVG ELEMENTS /////////////////////
//////////////////////////////////////////////////////////////////

const populationText = svg
  .append("text")
  .attr("class", "population-text")
  .attr("transform", "translate(20, 30)");

////////////////////////////////////////////////////////////////////////
////////////////////// RENDERING THE VISUALISATION /////////////////////
////////////////////////////////////////////////////////////////////////

// this function is called every time when a country is set
const updateTreeMap = (selectedCountryData) => {
  const transition = d3.transition().duration(750);

  const hierarchyData = d3
    .hierarchy(selectedCountryData)
    // we have to provide a "sum" function which will say how much is the total for a given tile after summing up all its node descendants
    // in our case we know that the children are the leaves of the tree and we just provide the value for each of them
    .sum((data) => data.percentage)
    // sort the children from the biggest to the smallest
    .sort((a, b) => b.data.percentage - a.data.percentage);

  treemap(hierarchyData);

  // scale font depending on the sum of rectangle's width and percentage value
  fontScale.domain([
    0,
    d3.max(hierarchyData.children, (data) => getRectangleWidth(data)),
  ]);

  // JOIN svg groups with data
  let cells = group.selectAll(".cell").data(hierarchyData.leaves());

  // UPDATE already existing qroups
  cells
    .transition(transition)
    .attr("transform", (cell) => `translate(${cell.x0}, ${cell.y0})`)
    // withing each group find a rectangle and update its dimensions
    .select("rect")
    .attr("width", (cell) => cell.x1 - cell.x0)
    .attr("height", (cell) => cell.y1 - cell.y0);

  cells
    // withing each group find a text and update its content and coordinates
    .select("text")
    .transition(transition)
    .text((cell) => `${cell.data.type} (${cell.data.percentage}%)`)
    .attr("x", (cell) => (cell.x1 - cell.x0) / 2)
    .attr("y", (cell) => (cell.y1 - cell.y0) / 2);

  // ENTER groups
  cells = cells
    .enter()
    // for each node create a group where an SVG rectangle and text will be added
    .append("g")
    .attr("class", "cell")
    .attr("transform", (cell) => `translate(${cell.x0}, ${cell.y0})`);

  cells
    // append a rectangle to each cell group
    .append("rect")
    .transition(transition)
    .attr("width", (cell) => cell.x1 - cell.x0)
    .attr("height", (cell) => cell.y1 - cell.y0)
    .attr("fill", (cell) => colourScale(cell.data.type));

  cells
    // append a text to each cell group
    .append("text")
    .text((cell) => `${cell.data.type} (${cell.data.percentage}%)`)
    .attr("class", "type")
    .attr("x", (cell) => (cell.x1 - cell.x0) / 2)
    .attr("y", (cell) => (cell.y1 - cell.y0) / 2)
    .attr("fill", "white")
    .attr("font-size", (cell) => fontScale(getRectangleWidth(cell)))
    .attr("text-anchor", "middle");

  // update the text on top of the tree map
  populationText.text(`Population: ${selectedCountryData.population}`);
};

/////////////////////////////////////////////////////////////
////////////////////// LOADING THE DATA /////////////////////
/////////////////////////////////////////////////////////////

(async () => {
  const transformData = (data) => {
    // argument "data" represents a row in the file

    const newData = { children: [] };

    Object.keys(data).forEach((key) => {
      if (key !== "index" && key !== "country" && key !== "population") {
        const text = data[key].replaceAll("%", "");

        // we have to group the properties representing blood types into an array of children
        // because the "treemap" layout expects an array of "children data" representing parts of a whole
        newData.children.push({ type: key, percentage: Number(text) });
      } else {
        newData[key] = data[key];
      }
    });

    return newData;
  };

  // a second argument is a function which does a data transformation after the data is loaded
  loadedData = await d3.csv("data/blood_types.csv", transformData);

  const countries = loadedData.map((row) => row.country);
  const bloodTypes = loadedData[0].children.map((item) => item.type);

  // we can set the colour scheme right at the beginning, because the list of blood types is the same for all countries
  colourScale.domain(bloodTypes);

  // populate selectbox with the list of countries
  const select = $("#country-select");
  $.each(countries, (index, country) => {
    select.append(`<option value="${index}">${country}</option>`);
  });

  updateTreeMap(loadedData[0]);
})();
