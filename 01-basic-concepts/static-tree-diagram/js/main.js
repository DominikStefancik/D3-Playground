/////////////////////////////////////////////////////////////////////////
////////////////////// SETTING UP THE VISUALISATION /////////////////////
/////////////////////////////////////////////////////////////////////////

const MARGIN = { TOP: 10, BOTTOM: 10, LEFT: 25, RIGHT: 350 };
const WIDTH = 1200 - MARGIN.LEFT - MARGIN.RIGHT;
// height has to be quite big, because we have a lot of leef nodes
const HEIGHT = 8000 - MARGIN.TOP - MARGIN.BOTTOM;

const FONT_STYLE = "Georgia";
const NODE_RADIUS = 8;
const NODE_TYPE = {
  EARTH: "Earth",
  CONTINENT: "Continent",
  COUNTRY: "Country",
};
const NODE_COLOUR = {
  earth: "#A3E7FF",
  AF: "#FFD700",
  NA: "#00FF00",
  OC: "#B50CCB",
  AN: "#5163E7",
  AS: "#FF6D00",
  EU: "#C20000",
  SA: "#009D00",
};

const svg = d3
  .select("#diagram-area")
  .append("svg")
  .attr("width", WIDTH + MARGIN.LEFT + MARGIN.RIGHT)
  .attr("height", HEIGHT);

const group = svg
  .append("g")
  .attr("width", WIDTH)
  .attr("height", HEIGHT)
  .attr("transform", `translate(${MARGIN.LEFT}, ${MARGIN.TOP})`);

const tooltip = d3
  .tip()
  // this class has to be set, otherwise the tooltip will not be styled and nicely visible
  .attr("class", "d3-tip")
  .html((event, nodeData) => {
    let text = `<strong>Type:</strong> <span style="color:red;">${nodeData.data.type}</span><br />`;
    text += `<strong>Name:</strong> <span style="color:red;">${nodeData.data.name}</span><br />`;
    text += getNodeTextForTooltip(nodeData);

    return text;
  });

// invoke the tooltip in the context of our visualization
group.call(tooltip);

const getNodeTextForTooltip = (nodeData) => {
  switch (nodeData.data.type) {
    case NODE_TYPE.EARTH:
      return `<strong>Number of continents:</strong> <span style="color:red;">${nodeData.data.children.length}</span><br />`;
    case NODE_TYPE.CONTINENT:
      return `<strong>Number of countries:</strong> <span style="color:red;">${nodeData.data.children.length}</span><br />`;
    case NODE_TYPE.COUNTRY:
      let text = `<strong>Capital City:</strong> <span style="color:red;">${nodeData.data.capital}</span><br />`;
      text += `<strong>Currency:</strong> <span style="color:red;">${nodeData.data.currency}</span><br />`;
      text += `<strong>Phone Code:</strong> <span style="color:red;">${nodeData.data.phone}</span><br />`;

      return text;
    default:
      return "";
  }
};

// tree layout produces tidy node-link diagrams of trees
const tree = d3.tree().size([HEIGHT, WIDTH]);

////////////////////////////////////////////////////////////////////////
////////////////////// RENDERING THE VISUALISATION /////////////////////
////////////////////////////////////////////////////////////////////////

const showDiagram = (data) => {
  // "d3.hierarchy" computes a hierachical layout of the data
  // expects the data to be in a hierarchical format with a "root" node and a list of children
  // for each node computes its "x" and "y" position, parent, depth and its links
  const hierarchy = d3.hierarchy(data);

  // first add links
  const links = group
    .selectAll("path")
    .data(tree(hierarchy).links())
    .enter()
    .append("path")
    .attr("class", "line")
    .attr(
      "d",
      d3
        .linkHorizontal()
        .x((link) => link.y)
        .y((link) => link.x)
    )
    .attr("stroke", (link) => NODE_COLOUR[link.source.data.code]);

  // then add nodes, so they can overlap the links' end
  const nodes = group
    .selectAll("circle")
    .data(hierarchy.descendants())
    .enter()
    // for each node create a group where an SVG circle and text will be added
    .append("g")
    .attr("class", (node) =>
      "node " + node.children ? "node-internal" : "node-leaf"
    )
    .attr("transform", (node) => `translate(${node.y}, ${node.x})`);

  nodes
    // add a circle to the node group
    .append("circle")
    .on("mouseover", tooltip.show)
    .on("mouseout", tooltip.hide)
    .attr("r", NODE_RADIUS)
    .attr("fill", (node) =>
      node.data.type === NODE_TYPE.COUNTRY
        ? NODE_COLOUR[node.parent.data.code]
        : NODE_COLOUR[node.data.code]
    );

  nodes
    // add a text to the node group
    .append("text")
    // adjust x-position of the text depending on the node being a parent or a leef
    .attr("x", (node) => (node.children ? 0 : NODE_RADIUS + 10))
    // adjust y-position of the text depending on the node being a parent or a leef
    .attr("y", (node) => (node.children ? -NODE_RADIUS - 10 : 5))
    .attr("font-family", FONT_STYLE)
    .attr("text-anchor", (node) => (node.children ? "middle" : "start"))
    .text((node) => node.data.name);
};

///////////////////////////////////////////////////////////////////////////////////////////////
////////////////////// TRANSFORMING THE DATA INTO A HIERACHICAL STRUCTURE /////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////

const createTreeData = (data) => {
  const [
    continentNames,
    countryNames,
    countryCapitals,
    countryCurrencies,
    countryPhones,
    countryToContinent,
  ] = data;

  const treeData = {
    code: "earth",
    name: "World",
    type: NODE_TYPE.EARTH,
    children: [],
  };

  const countriesGroups = d3.group(
    Object.entries(countryToContinent).map((array) => ({
      code: array[0],
      continent: array[1],
    })),
    (data) => data.continent
  );

  Object.keys(continentNames).forEach((continentKey) => {
    const countries = countriesGroups.get(continentKey);

    const continentData = {
      code: continentKey,
      name: continentNames[continentKey],
      type: NODE_TYPE.CONTINENT,
      children: countries.map((country) => {
        const code = country.code;

        return {
          code,
          name: countryNames[code],
          type: NODE_TYPE.COUNTRY,
          capital: countryCapitals[code],
          phone: countryPhones[code],
          currency: countryCurrencies[code],
        };
      }),
    };

    treeData.children.push(continentData);
  });

  return treeData;
};

/////////////////////////////////////////////////////////////
////////////////////// LOADING THE DATA /////////////////////
/////////////////////////////////////////////////////////////

(async () => {
  const data = createTreeData(
    await Promise.all([
      d3.json("data/continent-code-to-name.json"),
      d3.json("data/country-code-to-name.json"),
      d3.json("data/country-code-to-capital.json"),
      d3.json("data/country-code-to-currency-code.json"),
      d3.json("data/country-code-to-phone-code.json"),
      d3.json("data/country-to-continent.json"),
    ])
  );

  showDiagram(data);
})();
