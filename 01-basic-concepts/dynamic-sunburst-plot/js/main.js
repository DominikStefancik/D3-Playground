/////////////////////////////////////////////////////////////////////////
////////////////////// SETTING UP THE VISUALISATION /////////////////////
/////////////////////////////////////////////////////////////////////////

const WIDTH = 1200;
const HEIGHT = 750;
const RADIUS = Math.min(WIDTH, HEIGHT) / 2;
const DEGREE_360 = Math.PI * 2;
const NODE_TYPE = {
  EARTH: "Earth",
  CONTINENT: "Continent",
  REGION: "Region",
  COUNTRY: "Country",
};
const LAYER_COLOUR = {
  AF: { continent: "#A8986B", region: "#DAC999", country: "#F9EACF" },
  NA: { continent: "#0068B9", region: "#9EC4FF", country: "#D1F7FF" },
  OC: { continent: "#A2228D", region: "#DD5CC5", country: "#EFAEEA" },
  AS: { continent: "#C16300", region: "#FA910E", country: "#FFCC78" },
  EU: { continent: "#009900", region: "#46CB00", country: "#AEFF62" },
  SA: { continent: "#A00000", region: "#DA2C27", country: "#FC9E8F" },
};
let populationData;
let continentNames;
let regionNames;
let currentOption = "population";
let path;

const arcDegreesScale = d3.scaleLinear().range([0, DEGREE_360]);

const widthScale = d3.scaleSqrt().range([0, RADIUS]);

// partition layout which expects data in the format of hierarchy
const partition = d3.partition();

// data values will be provided by "d3.partition()"
const arc = d3
  .arc()
  .startAngle((data) =>
    Math.max(0, Math.min(DEGREE_360, arcDegreesScale(data.x0)))
  )
  .endAngle((data) =>
    Math.max(0, Math.min(DEGREE_360, arcDegreesScale(data.x1)))
  )
  .innerRadius((data) => Math.max(0, widthScale(data.y0)))
  .outerRadius((data) => Math.max(0, widthScale(data.y1)));

const canvas = d3
  .select("#plot-area")
  .append("svg")
  .attr("width", WIDTH)
  .attr("height", HEIGHT)
  .append("g")
  .attr("transform", `translate(${WIDTH / 2}, ${HEIGHT / 2})`);

const tooltip = createTooltip();
// invoke the tooltip in the context of our visualization
canvas.call(tooltip);

$("input[name|='radioOptions']").on("change", function () {
  currentOption = $(this).val();
  updatePlot();
});

// helper function for getting a fill colour for a node depending on its type
const getNodeColour = (node) => {
  switch (node.data.type) {
    case NODE_TYPE.EARTH:
      return "white";
    case NODE_TYPE.CONTINENT:
      return LAYER_COLOUR[node.data.continent].continent;
    case NODE_TYPE.REGION:
      return LAYER_COLOUR[node.parent.data.continent].region;
    case NODE_TYPE.COUNTRY:
      return LAYER_COLOUR[node.data.continent_code].country;
    default:
      return "";
  }
};

////////////////////////////////////////////////////////////////////////
////////////////////// RENDERING THE VISUALISATION /////////////////////
////////////////////////////////////////////////////////////////////////

// this function renders the plot for the very forst time
const initPlot = () => {
  const hierarchyData = d3
    .hierarchy(populationData)
    // we have to provide a "sum" function which will say how much is the total for a given tile after summing up all its node descendants
    .sum((data) => data[currentOption])
    // sort the children from the biggest to the smallest
    .sort((a, b) => b.data[currentOption] - a.data[currentOption]);

  // partition layout adds additional "x0", "x1", "y0", "y1" to each node in the hierarchy
  // y-values are ranging from 0 to 1 depending on the node's depth in the hierarchy
  // x-values add up to 1 in the each level of the hierarchy
  partition(hierarchyData);

  path = canvas
    .selectAll("path")
    .data(hierarchyData.descendants())
    .enter()
    .append("path")
    .on("mouseover", tooltip.show)
    .on("mouseout", tooltip.hide)
    .attr("d", arc)
    .attr("fill", (node) => getNodeColour(node));

  // add image into the center of the plot
  const image = canvas.selectAll("image").data([0]);
  image
    .enter()
    .append("svg:image")
    .attr("xlink:href", "./img/earth.png")
    .attr("x", -125)
    .attr("y", -125)
    .attr("width", "250")
    .attr("height", "250");
};

// this function updates the plot every time a user changes the radio button
const updatePlot = () => {
  const transition = d3.transition().duration(3000);

  const hierarchyData = d3
    .hierarchy(populationData)
    .sum((data) => data[currentOption])
    // sort the children from the biggest to the smallest
    .sort((a, b) => b.data[currentOption] - a.data[currentOption]);

  partition(hierarchyData);

  // set new data to the path
  path.data(hierarchyData.descendants());

  // The "attrTween()" function assigns the attribute "tween" for the "d" attribute to the specified interpolator factory.
  // An interpolator factory is a function that returns an interpolator. When the transition starts, the factory is evaluated for each selected element.
  // The returned interpolator will then be invoked for each frame of the transition, in order, being passed the eased time "t",
  // typically in the range [0, 1]. Lastly, the return value of the interpolator will be used to set the attribute value.
  // The interpolator must return a string.
  path.transition(transition).attrTween("d", (data) => () => arc(data));
};

/////////////////////////////////////////////////////////////
////////////////////// LOADING AND TRANSFORMING THE DATA /////////////////////
/////////////////////////////////////////////////////////////

const transformContinent = (continentEntry) => {
  const continentCode = continentEntry[0];
  const continentChildren = continentEntry[1];

  const regions = Array.from(
    // in each continent group countries according to the region they belong to
    d3.group(continentChildren, (data) => data.region_code)
  ).map((regionEntry) => transformRegion(regionEntry));

  return {
    id: continentCode,
    continent: continentCode,
    type: NODE_TYPE.CONTINENT,
    children: regions,
  };
};

const transformRegion = (regionEntry) => {
  const regionCode = regionEntry[0];
  const regionChildren = regionEntry[1];

  return {
    // id is necessary for the D3 Data Join
    id: regionCode,
    region: regionCode,
    type: NODE_TYPE.REGION,
    children: regionChildren.map((node) => transformCountry(node)),
  };
};

const transformCountry = (node) => {
  return {
    ...node,
    urban_population:
      node.urban_population === "N.A."
        ? 0
        : node.urban_population.replace("%", ""),
    // id is necessary for the D3 Data Join
    id: node.country,
    type: NODE_TYPE.COUNTRY,
  };
};

// transform tabular data into hierarchy
// thi final hierarchy is Earth -> Continents -> Regions -> Countries
const transformData = (data) => {
  const continents = Array.from(
    // group countries according to the continent they belong to
    d3.group(data, (data) => data.continent_code)
  ).map((continentEntry) => transformContinent(continentEntry));

  return {
    // id is necessary for the D3 Data Join
    id: NODE_TYPE.EARTH,
    type: NODE_TYPE.EARTH,
    children: continents,
  };
};

(async () => {
  const [countryData, continentData, regionData] = await Promise.all([
    d3.csv("data/population_by_country_and_continent_2020.csv"),
    d3.json("data/continent-code-to-name.json"),
    d3.json("data/continent-region-code-to-name.json"),
  ]);

  populationData = transformData(countryData);
  continentNames = continentData;
  regionNames = regionData;

  initPlot(populationData);
})();
