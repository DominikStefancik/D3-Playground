//////////////////////////////////////////////////////////////////
////////////////////// TOOLTIP FUNCTIONALITY /////////////////////
//////////////////////////////////////////////////////////////////

// helper function for getting info about a node for tooltip
const getNodeTextForTooltip = (node) => {
  let text;

  switch (node.data.type) {
    case NODE_TYPE.EARTH:
      text = getTooltipLine("Planet", "Earth");
      text += getTooltipLine("Number of continents", getChildrenCount(node));
      text += getTooltipLine("Number of regions", getNumberOfRegions(node));
      text += getTooltipLine("Number of countries", getNumberOfCountries(node));
      text += getTooltipLine("Population", getPopulation(node));
      break;
    case NODE_TYPE.CONTINENT:
      text = getTooltipLine("Continent", continentNames[node.data.continent]);
      text += getTooltipLine("Number of regions", getNumberOfRegions(node));
      text += getTooltipLine("Number of countries", getNumberOfCountries(node));
      text += getTooltipLine("Population", getPopulation(node));
      break;
    case NODE_TYPE.REGION:
      text = getTooltipLine("Region", regionNames[node.data.region]);
      text += getTooltipLine("Number of countries", getNumberOfCountries(node));
      text += getTooltipLine("Population", getPopulation(node));
      break;
    case NODE_TYPE.COUNTRY:
      text = getTooltipLine("Country", node.data.country);
      text += getTooltipLine("Population", getPopulation(node));
      text += getTooltipLine(
        "Urban Population",
        node.data.urban_population,
        "%"
      );
      text += getTooltipLine("Land area", node.data.land_area, " km2");
      text += getTooltipLine(
        "Number of people / km2",
        formatNumber(node.data.density)
      );
      break;
    default:
      return "";
  }

  return text;
};

const getTooltipLine = (prefix, value, suffix) => {
  return `<strong>${prefix}:</strong> <span style="color:red;">${value}${
    suffix ? suffix : ""
  }</span><br />`;
};

const getChildrenCount = (node) => node.children.length;

const getGrandchildrenCount = (node) =>
  d3.sum(node.data.children, (child) => child.children.length);

const getNumberOfRegions = (node) => {
  switch (node.data.type) {
    case NODE_TYPE.EARTH:
      return getGrandchildrenCount(node);
    case NODE_TYPE.CONTINENT:
      return getChildrenCount(node);
    default:
      return 0;
  }
};

const getNumberOfCountries = (node) => {
  switch (node.data.type) {
    case NODE_TYPE.EARTH:
      return d3.sum(node.data.children, (continent) =>
        d3.sum(continent.children, (region) => region.children.length)
      );
    case NODE_TYPE.CONTINENT:
      return getGrandchildrenCount(node);
    case NODE_TYPE.REGION:
      return getChildrenCount(node);
    default:
      return 0;
  }
};

const getPopulation = (node) => {
  let population;

  switch (node.data.type) {
    case NODE_TYPE.EARTH:
      population = d3.sum(node.data.children, (continent) =>
        d3.sum(continent.children, (region) =>
          d3.sum(region.children, (country) => country.population)
        )
      );
      break;
    case NODE_TYPE.CONTINENT:
      population = d3.sum(node.data.children, (region) =>
        d3.sum(region.children, (country) => country.population)
      );
      break;
    case NODE_TYPE.REGION:
      population = d3.sum(node.data.children, (country) => country.population);
      break;
    case NODE_TYPE.COUNTRY:
      population = node.data.population;
      break;
    default:
      population = 0;
  }

  return formatNumber(population);
};

// helper function for formating number
const formatNumber = (number) => d3.format(",.0f")(number);

const createTooltip = () => {
  return (
    d3
      .tip()
      // this class has to be set, otherwise the tooltil will not be styled and nicely visible
      .attr("class", "d3-tip")
      .html((_, node) => {
        return getNodeTextForTooltip(node);
      })
  );
};
