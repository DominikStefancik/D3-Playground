const MARGIN = { top: 10, right: 10, bottom: 55, left: 65 };
const WIDTH = 1060 - MARGIN.left - MARGIN.right;
const HEIGHT = 740 - MARGIN.top - MARGIN.bottom;
const AXIS_LABEL_FONT_SIZE = 20;
const CONTINENT_BAR = {
  width: 120,
  height: 50,
  x: WIDTH - 140,
  y: (index) => HEIGHT / 2 + index * 60,
  text: {
    x: WIDTH - 80,
    y: (index) => HEIGHT / 2 + index * 60 + 30,
  },
};
const FONT_STYLE = "Courier";

const group = d3
  .select("#plot-area")
  .append("svg")
  .attr("width", WIDTH + MARGIN.left + MARGIN.right)
  .attr("height", HEIGHT + MARGIN.top + MARGIN.bottom)
  .append("g")
  .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");

const xScale = d3.scaleLog().base(10).domain([100, 150000]).range([0, WIDTH]);
const yScale = d3.scaleLinear().domain([0, 90]).range([HEIGHT, 0]);
const colourScale = d3.scaleOrdinal().range(d3.schemeSet3);
const circleScale = d3.scaleLinear().range([5, 25]);

const xAxisCall = d3
  .axisBottom(xScale)
  .tickValues([400, 4000, 40000])
  .tickFormat((value) => `$${value}`);
const yAxisCall = d3.axisLeft(yScale);

const xAxisGroup = group
  .append("g")
  .attr("transform", `translate(0, ${HEIGHT})`)
  .attr("width", WIDTH);
const yAxisGroup = group.append("g");

const yearLabel = group
  .append("text")
  .attr("x", WIDTH - 45)
  .attr("y", HEIGHT - 35)
  .attr("font-size", 35)
  .attr("font-family", FONT_STYLE)
  .attr("text-anchor", "end");

group
  .append("text")
  .text("GDP per Capita")
  .attr("x", WIDTH / 2)
  .attr("y", HEIGHT + 40)
  .attr("font-size", AXIS_LABEL_FONT_SIZE)
  .attr("font-family", FONT_STYLE)
  .attr("text-anchor", "middle");

group
  .append("text")
  .text("Life Expectancy (Years)")
  .attr("x", -HEIGHT / 2)
  .attr("y", -MARGIN.left + 15)
  .attr("font-size", AXIS_LABEL_FONT_SIZE)
  .attr("font-family", FONT_STYLE)
  .attr("text-anchor", "middle")
  .attr("transform", "rotate(-90)");

const getRadiusFromPopulation = (population) => {
  // Area = PI * Radius^2
  return Math.sqrt(population / Math.PI);
};

const extractContinents = (countries) => {
  const allContinents = countries.countries.map((country) => country.continent);
  return Array.from(new Set(allContinents));
};

const updatePlot = (countriesData) => {
  const countries = countriesData.countries;
  const year = countriesData.year;
  const transition = d3.transition().duration(100);

  circleScale.domain([
    0,
    d3.max(countries, (country) => getRadiusFromPopulation(country.population)),
  ]);
  xAxisGroup.call(xAxisCall);
  yAxisGroup.call(yAxisCall);
  yearLabel.text(year);

  const circles = group
    .selectAll("circle")
    .data(countries, (item) => item.country);

  circles.exit().remove();

  circles
    .enter()
    .append("circle")
    .style("fill", (country) => colourScale(country.continent))
    .merge(circles)
    .transition(transition)
    .attr("cx", (country) => xScale(country.income))
    .attr("cy", (country) => yScale(country.life_exp))
    .attr("r", (country) =>
      circleScale(getRadiusFromPopulation(country.population))
    );
};

(async () => {
  const data = await d3.json("data/data.json");

  // clean data
  const countries = data.map((year) => {
    const countriesWithoutNull = year.countries
      .filter((country) => country.income && country.life_exp)
      .map((country) => {
        country.population = Number(country.population);
        country.income = Number(country.income);
        country.life_exp = Number(country.life_exp);

        return country;
      });

    return {
      countries: countriesWithoutNull,
      year: year.year,
    };
  });

  let index = 0;
  let year;

  const continents = extractContinents(countries[0]);
  colourScale.domain(continents);

  const bars = group.selectAll("rect").data(continents);

  bars
    .enter()
    .append("rect")
    .attr("x", CONTINENT_BAR.x)
    .attr("y", (data, index) => CONTINENT_BAR.y(index))
    .attr("width", CONTINENT_BAR.width)
    .attr("height", CONTINENT_BAR.height)
    .style("fill", (continent) => colourScale(continent));

  bars
    .enter()
    .append("text")
    .text((continent) => continent)
    .attr("x", CONTINENT_BAR.text.x)
    .attr("y", (data, index) => CONTINENT_BAR.text.y(index))
    .attr("font-size", AXIS_LABEL_FONT_SIZE)
    .attr("font-family", FONT_STYLE)
    .attr("text-anchor", "middle");

  d3.interval(() => {
    year = countries[index++];
    updatePlot(year);

    if (index === countries.length) {
      index = 0;
    }
  }, 200);
})();
