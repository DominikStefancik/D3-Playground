const MARGIN_TOP = 100;
const WIDTH = 1200;
const HEIGHT = 750 - MARGIN_TOP;
const FIRST_YEAR = 1950;
const LAST_YEAR = 2020;
const TRANSITION_DURATION = 750;
const OPTION_ALL = "all";
let populationData;
let interval;
let currentYear = FIRST_YEAR;
let currentContinent = OPTION_ALL;
let numberOfCountries = OPTION_ALL;

const TILE_COLOUR = {
  AF: { content: "#F0DEB4", text: "black" },
  NA: { content: "#9EC4FF", text: "white" },
  OC: { content: "#DD5CC5", text: "white" },
  AS: { content: "#FFAC1E", text: "black" },
  EU: { content: "#AEFF62", text: "black" },
  SA: { content: "#FF7763", text: "white" },
};

// scale for fonts
const fontScale = d3.scaleLinear().range([5, 40]);

const svg = d3
  .select("#treemap-area")
  .append("svg")
  .attr("width", WIDTH)
  .attr("height", HEIGHT + MARGIN_TOP);

const group = svg.append("g").attr("transform", "translate(0, 50)");

const populationText = svg
  .append("text")
  .attr("class", "population-text")
  .attr("transform", "translate(20, 30)");

const tooltip = d3
  .tip()
  // this class has to be set, otherwise the tooltil will not be styled and nicely visible
  .attr("class", "d3-tip")
  .html((_, country) => {
    let text = `<strong>Country:</strong> <span style="color:red;text-transform:capitalize">${country.data.country}</span><br />`;
    text += `<strong>Population:</strong> <span style="color:red">${populationFormat(
      country.data.population
    )}</span><br />`;
    text += `<strong>Year:</strong> <span style="color:red">${country.data.year}</span><br />`;

    return text;
  });

// invoke the tooltip in the context of our visualization
group.call(tooltip);

const treemap = d3
  .treemap()
  .tile(d3.treemapResquarify)
  .size([WIDTH, HEIGHT])
  .round(true)
  .paddingInner(1);

$("#play-button").on("click", function () {
  // grab the button which was clicked
  const button = $(this);
  if (button.text() === "Play") {
    button.text("Pause");
    interval = setInterval(() => {
      updateTreeMap(populationData[currentYear]);

      if (currentYear === LAST_YEAR) {
        currentYear = FIRST_YEAR;
      } else {
        currentYear++;
      }
    }, TRANSITION_DURATION + 50);
  } else {
    button.text("Play");
    clearInterval(interval);
  }
});

$("#reset-button").on("click", () => {
  currentYear = FIRST_YEAR;
  updateTreeMap(populationData[currentYear]);
});

$("#country-number-select").on("change", function () {
  numberOfCountries = $(this).val();
  updateTreeMap(populationData[currentYear]);
});

$("#continent-select").on("change", function () {
  currentContinent = $(this).val();
  updateTreeMap(populationData[currentYear]);
});

// initialise slider
$("#year-slider").slider({
  min: FIRST_YEAR,
  max: 2020,
  step: 1,
  slide: (event, ui) => {
    currentYear = ui.value;

    updateTreeMap(populationData[currentYear]);
  },
});

// filtering function
const getFilteredData = (data) => {
  // filter children according to the continent
  let children =
    currentContinent === OPTION_ALL
      ? data.children
      : data.children.filter(
          (country) => country.continent === currentContinent
        );

  // filter children according to the number of countries
  children =
    numberOfCountries === OPTION_ALL
      ? children
      : children.slice(0, Number(numberOfCountries));

  return { children };
};

// helper function for getting a rectangle width increased with value of a reverse index
const getRectangleWidth = (data, reverseIndex) =>
  data.x1 - data.x0 + reverseIndex;

// helper function for formating population number
const populationFormat = (population) =>
  `${d3.format(",.0f")(population)} mil.`;

const updateTreeMap = (selectedYearData) => {
  const transition = d3.transition().duration(750);

  const filteredData = getFilteredData(selectedYearData);

  const hierarchyData = d3
    .hierarchy(filteredData)
    .sum((data) => data.population)
    .sort((a, b) => b.data.population - a.data.population);

  treemap(hierarchyData);

  const numberOfCountries = hierarchyData.leaves().length;

  fontScale.domain([
    0,
    d3.max(hierarchyData.children, (data, index) =>
      getRectangleWidth(data, numberOfCountries - index)
    ),
  ]);

  let cells = group
    .selectAll(".cell")
    .data(hierarchyData.leaves(), (country) => country.data.country);

  cells.exit().remove();

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
    .text((cell) => cell.data.country)
    .attr("x", (cell) => (cell.x1 - cell.x0) / 2)
    .attr("y", (cell) => (cell.y1 - cell.y0) / 2);

  cells = cells
    .enter()
    .append("g")
    .on("mouseover", tooltip.show)
    .on("mouseout", tooltip.hide)
    .attr("class", "cell")
    .attr("transform", (cell) => `translate(${cell.x0}, ${cell.y0})`);

  cells
    .append("rect")
    .transition(transition)
    .attr("width", (cell) => cell.x1 - cell.x0)
    .attr("height", (cell) => cell.y1 - cell.y0)
    .attr("fill", (cell) => TILE_COLOUR[cell.data.continent].content);

  cells
    .append("text")
    .text((cell) => cell.data.country)
    .attr("class", "country-name")
    .attr("x", (cell) => (cell.x1 - cell.x0) / 2)
    .attr("y", (cell) => (cell.y1 - cell.y0) / 2)
    .attr("font-size", (cell, index) =>
      fontScale(getRectangleWidth(cell, numberOfCountries - index))
    )
    .attr("text-anchor", "middle")
    .attr("fill", (cell) => TILE_COLOUR[cell.data.continent].text);

  const population = d3.sum(
    hierarchyData.leaves(),
    (item) => item.data.population
  );

  // update the text on top of the tree map
  populationText.text(`Population in total: ${populationFormat(population)}`);

  // also update slider for each iteration
  $("#year-slider").slider("value", currentYear);
  $("#year")[0].innerHTML = String(currentYear);
};

// function for formatting tabular data into a hierarchy format
const transformData = (loadedData) => {
  const transformedData = {};

  loadedData.forEach((countryData) => {
    Object.keys(countryData).forEach((key) => {
      if (key !== "country" && key !== "country_code") {
        if (transformedData[key] === undefined) {
          transformedData[key] = { children: [] };
        }

        transformedData[key].children.push({
          country: countryData.country,
          continent: countryData.continent_code,
          population: Number(countryData[key]),
          year: key,
        });
      }
    });
  });

  // sort countries for each year according to their population in descending order
  // (i.e. the most populated countries are first)
  Object.keys(transformedData).forEach((yearKey) => {
    transformedData[yearKey].children.sort((first, second) => {
      return second.population - first.population;
    });
  });

  return transformedData;
};

(async () => {
  const [countriesData, continentData] = await Promise.all([
    d3.csv("data/UN_Population_1950-2020.csv"),
    d3.json("data/continent-code-to-name.json"),
  ]);

  populationData = transformData(countriesData);

  // populate selectbox with the list of continents
  const select = $("#continent-select");
  $.each(Object.keys(continentData), (index, key) => {
    select.append(`<option value="${key}">${continentData[key]}</option>`);
  });

  updateTreeMap(populationData[FIRST_YEAR]);
})();
