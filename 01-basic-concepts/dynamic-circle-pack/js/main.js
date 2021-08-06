/////////////////////////////////////////////////////////////////////////
////////////////////// SETTING UP THE VISUALISATION /////////////////////
/////////////////////////////////////////////////////////////////////////

const WIDTH = 1200;
const HEIGHT = 750;
const NODE_TYPE = {
  EARTH: "Earth",
  CONTINENT: "Continent",
  COUNTRY: "Country",
};
const CONTINENT_COLOUR = {
  AF: { continent: "#DAC999", country: "#F0DEB4" },
  NA: { continent: "#9EC4FF", country: "#D1F7FF" },
  OC: { continent: "#DD5CC5", country: "#EFAEEA" },
  AS: { continent: "#FA910E", country: "#FABE5B" },
  EU: { continent: "#46CB00", country: "#AEFF62" },
  SA: { continent: "#DA2C27", country: "#FF7763" },
};
const MINIMUN_RADIUS_FOR_TEXT = 25;
let populationData;
let continentNames;
let currentOption = "population";

// scale for fonts
const fontScale = d3.scaleLinear().range([5, 30]);

const canvas = d3
  .select("#chart-area")
  .append("svg")
  .attr("width", WIDTH)
  .attr("height", HEIGHT);

const tooltip = d3
  .tip()
  // this class has to be set, otherwise the tooltil will not be styled and nicely visible
  .attr("class", "d3-tip")
  .html((_, node) => {
    return getNodeTextForTooltip(node);
  });

// invoke the tooltip in the context of our visualization
canvas.call(tooltip);

$("input[name|='radioOptions']").on("change", function () {
  currentOption = $(this).val();
  updateCirclePack();
});

// pack layout which expects data in the format of hierarchy
const pack = d3.pack().size([WIDTH, HEIGHT]).padding(3);

/////////////////////////////////////////////////////////////
////////////////////// HELPER FUNCTIONS /////////////////////
/////////////////////////////////////////////////////////////

// helper function for tooltip to get info about a node
const getNodeTextForTooltip = (node) => {
  let text;

  switch (node.data.type) {
    case NODE_TYPE.EARTH:
      text = `<strong>Planet:</strong> <span style="color:red;">Earth</span><br />`;
      text += `<strong>Number of continents:</strong> <span style="color:red;">${node.data.children.length}</span><br />`;
      text += `<strong>Number of countries:</strong> <span style="color:red;">${d3.sum(
        node.data.children,
        (continent) => continent.children.length
      )}</span><br />`;
      text += `<strong>Population:</strong> <span style="color:red;">${formatNumber(
        d3.sum(node.data.children, (continent) =>
          d3.sum(continent.children, (country) => country.population)
        )
      )}</span><br />`;
      break;
    case NODE_TYPE.CONTINENT:
      text = `<strong>Continent:</strong> <span style="color:red;">${
        continentNames[node.data.continent]
      }</span><br />`;
      text += `<strong>Number of countries:</strong> <span style="color:red;">${node.data.children.length}</span><br />`;
      text += `<strong>Population:</strong> <span style="color:red;">${formatNumber(
        d3.sum(node.data.children, (country) => country.population)
      )}</span><br />`;
      break;
    case NODE_TYPE.COUNTRY:
      text = `<strong>Country:</strong> <span style="color:red;">${node.data.country}</span><br />`;
      text += `<strong>Population:</strong> <span style="color:red;">${formatNumber(
        node.data.population
      )}</span><br />`;
      text += `<strong>Urban Population:</strong> <span style="color:red;">${formatNumber(
        node.data.urban_population
      )}%</span><br />`;
      text += `<strong>Land area:</strong> <span style="color:red;">${formatNumber(
        node.data.land_area
      )} km2</span><br />`;
      text += `<strong>Number of people / km2:</strong> <span style="color:red;">${formatNumber(
        node.data.density
      )}</span><br />`;
      break;
    default:
      return "";
  }

  return text;
};

// helper function for formating a number
const formatNumber = (number) => d3.format(",.0f")(number);

// helper function for getting a fill colour for a node depending on its type
const getNodeColour = (node) => {
  switch (node.data.type) {
    case NODE_TYPE.EARTH:
      return "white";
    case NODE_TYPE.CONTINENT:
      return CONTINENT_COLOUR[node.data.continent].continent;
    case NODE_TYPE.COUNTRY:
      return CONTINENT_COLOUR[node.data.continent_code].country;
    default:
      return "";
  }
};

// helper function to decide whether a node is big enough to render a text into it
const isLeafBigEnough = (node) => {
  return !node.children && node.r > MINIMUN_RADIUS_FOR_TEXT;
};

////////////////////////////////////////////////////////////////////////
////////////////////// RENDERING THE VISUALISATION /////////////////////
////////////////////////////////////////////////////////////////////////

const updateCirclePack = () => {
  const transition = d3.transition().duration(750);

  const hierarchyData = d3
    .hierarchy(populationData)
    // we have to provide a "sum" function which will say how much is the total for a given node after summing up all its node descendants
    .sum((data) => data[currentOption])
    // sort the children from the biggest to the smallest
    .sort((a, b) => b.data[currentOption] - a.data[currentOption]);

  // calling "pack()" on the hierarchy data adds "x" and "y" coordinates and "radius" properties
  // to each node in the hierarchy
  pack(hierarchyData);

  // we have to set the domain AFTER we call the "pack()" on our hierarchy data
  // because only after that the node has the property "r"
  fontScale.domain([0, d3.max(hierarchyData.leaves(), (country) => country.r)]);

  // we want to join data with the "hierarchyData.descendants()"
  // because we want to include all nodes between the root node and the leaves
  let nodes = canvas
    .selectAll(".node")
    .data(hierarchyData.descendants(), (node) => node.data.id);

  // the number of nodes is always the same, so we don't need to use "nodes.exit().remove()"

  nodes
    // update "x" and "y" coordinates of each group
    .transition(transition)
    .attr("transform", (node) => `translate(${node.x}, ${node.y})`);

  nodes
    .transition(transition)
    // withing each group find a circle and update its radius
    .select("circle")
    .attr("r", (node) => node.r);

  nodes
    .transition(transition)
    // withing each group find a text and update its content
    .select("text")
    // When updating the text we check for each node if it has a big enough radius for the text.
    // If it does and had a text before, keep its text and update its font,
    // If it doesn't and had a text before, change its text to an empty string and font size to 0
    // If it does and didn't have a text before, set its text and font size,
    // If it doesn't and didn't have a text before, keep its text as an empty string and font size 0
    .text((node) => (isLeafBigEnough(node) ? node.data.country : ""))
    .attr("y", 5)
    .attr("font-size", (node) =>
      isLeafBigEnough(node) ? fontScale(node.r) : 0
    );

  nodes = nodes
    .enter()
    // for each node create a group where an SVG circle and text will be added
    .append("g")
    .attr(
      "class",
      (node) => `node ${node.children ? "node-root " : "node-leaf"}`
    )
    .attr("transform", (node) => `translate(${node.x}, ${node.y})`)
    .on("mouseover", tooltip.show)
    .on("mouseout", tooltip.hide);

  nodes
    .append("circle")
    .transition(transition)
    .attr("r", (node) => node.r)
    .attr("fill", (node) => getNodeColour(node));

  nodes
    // add text to all nodes
    .append("text")
    // if a node has a big enough radius, render a country name
    // otherwise, render an empty string
    .text((node) => (isLeafBigEnough(node) ? node.data.country : ""))
    // move text slightly down so it can be in the middle
    .attr("y", 5)
    .attr("font-size", (node) =>
      isLeafBigEnough(node) ? fontScale(node.r) : 0
    )
    .attr("text-anchor", "middle");
};

/////////////////////////////////////////////////////////////
////////////////////// LOADING THE DATA /////////////////////
/////////////////////////////////////////////////////////////

(async () => {
  const [countryData, continentData] = await Promise.all([
    d3.csv("data/population_by_country_2020.csv"),
    d3.json("data/continent-code-to-name.json"),
  ]);

  let counter = 1;

  // transform tabular data into hierarchy
  const continents = Array.from(
    d3.group(countryData, (data) => data.continent_code)
  ).map((entry) => ({
    // id is necessary for the D3 Data Join
    id: counter++,
    continent: entry[0],
    type: NODE_TYPE.CONTINENT,
    children: entry[1].map((node) => ({
      ...node,
      urban_population:
        node.urban_population === "N.A."
          ? 0
          : node.urban_population.replace("%", ""),
      // id is necessary for the D3 Data Join
      id: counter++,
      type: NODE_TYPE.COUNTRY,
    })),
  }));

  populationData = {
    // id is necessary for the D3 Data Join
    id: 0,
    type: NODE_TYPE.EARTH,
    children: continents,
  };
  continentNames = continentData;

  updateCirclePack(populationData);
})();
