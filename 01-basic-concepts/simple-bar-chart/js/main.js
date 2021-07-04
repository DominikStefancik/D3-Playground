/*
 *    A simple example of basic concepts of D3 (SVG, scales, axes, groups, rendering)
 */

(async () => {
  const dataJson = await d3.json("data/buildings.json");
  dataJson.forEach((building) => {
    building.height = Number(building.height);
  });

  const CANVAS_MARGIN = { left: 80, right: 10, top: 10, bottom: 130 };
  const GROUP_WIDTH = 600 - CANVAS_MARGIN.left - CANVAS_MARGIN.right;
  const GROUP_HEIGHT = 460 - CANVAS_MARGIN.top - CANVAS_MARGIN.bottom;

  /////////////////////////////// SETTING UP TRANSFORMATIONS ///////////////////////////////

  /////////////////////////////////////////////////////////////////////////
  /////////////////// LINEAR SCALE (for scaling height) ///////////////////
  /////////////////////////////////////////////////////////////////////////

  // output of the scaleLinear is a function which will do the conversion of a given value from the original domain
  // to a value from the range we define
  const yScale = d3
    .scaleLinear()
    // original domain of values we want to do transformation from
    .domain([0, d3.max(dataJson, (data) => data.height)])
    // range of values we want to tranfers to
    .range([GROUP_HEIGHT, 0]);

  ////////////////////////////////////////////////////////////////////////////////////////
  /////////////////// BAND SCALE (for scaling width and space between) ///////////////////
  ////////////////////////////////////////////////////////////////////////////////////////

  // band scales are exclusively used to space out different categories in x-axis (mostly used in a bar chart)
  const xScale = d3
    .scaleBand()
    // original domain of values we want to do transformation from
    .domain(dataJson.map((item) => item.name))
    // range of values we want to tranfers to
    .range([0, GROUP_WIDTH])
    // padding between the SVG elements which will be rendered
    .paddingInner(0.4)
    // padding between left side of the canvas and the first SVG element
    // and right side of the canvas and the last SVG element
    .paddingOuter(0.2);

  ///////////////////////////////////////////////////////////////////////////
  /////////////////// ORDINAL SCALE (for scaling colours) ///////////////////
  ///////////////////////////////////////////////////////////////////////////

  // output of the scaleOrdinal is a function which will do the conversion of a given value from the original domain
  // to a value from the range of ordinal values which in this case is set of colours
  const colours = d3
    .scaleOrdinal()
    // original domain of values we want to do transformation from
    .domain([dataJson.map((item) => item.name)])
    // range of ordinal values we want to tranfers to
    .range(d3.schemeAccent);

  //////////////////////////////////////////////////////////////////////////
  ////////////////////////////////// AXES //////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  // create x-axis using the band scale we defind earlier
  const xAxis = d3.axisBottom(xScale);

  // create y-axis using the linear scale we defind earlier
  const yAxis = d3.axisLeft(yScale).tickFormat((height) => height + "m");

  /////////////////////////////// CREATING SVG ELEMENTS FOR VISUALISATION ///////////////////////////////

  // find a div with the id "chart-area"
  const svgCanvas = d3
    .select("#chart-area")
    // and append an SVG canvas to it
    .append("svg")
    // set width of the canvas
    .attr("width", GROUP_WIDTH + CANVAS_MARGIN.left + CANVAS_MARGIN.right)
    // set height of the canvas
    .attr("height", GROUP_HEIGHT + CANVAS_MARGIN.top + CANVAS_MARGIN.bottom)
    .attr("style", "border:1px solid black;");

  // we add SVG group to the canvas which will contain all SVG elements
  // so from now on we will use the svgGroup to append our SVG elements to
  const svgGroup = svgCanvas
    .append("g")
    // group needs to be given "transform" attribute
    .attr(
      "transform",
      `translate(${CANVAS_MARGIN.left}, ${CANVAS_MARGIN.top})`
    );

  // append x-axis to the main group
  svgGroup
    .append("g")
    .attr("class", "x-axis")
    // we need to use transform for this axis to fit our visualisation
    .attr("transform", `translate(0, ${GROUP_HEIGHT})`)
    .call(xAxis)
    // in the x-axis, locate all label texts which were generated and adjust their attributes
    .selectAll("text")
    .attr("x", "-5")
    .attr("y", "10")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-40)");

  // append label of the x-axis to the main group
  svgGroup
    .append("text")
    .text("The world tallest buildings")
    .attr("class", "x-axis-label")
    .attr("x", GROUP_WIDTH / 2)
    .attr("y", GROUP_HEIGHT + 110)
    .attr("font-size", 15)
    .attr("font-family", "Comic Sans MS")
    .attr("text-anchor", "middle");

  // append y-axis to the main group
  svgGroup
    .append("g")
    .attr("class", "y-axis") // we don't need to use transform, because y-axis will be positioned to 0,0 coordinates of the group
    .call(yAxis);

  // append label of the y-axis to the main group
  svgGroup
    .append("text")
    .text("Height (m)")
    .attr("class", "y-axis-label")
    .attr("x", -(GROUP_HEIGHT / 2))
    .attr("y", -60)
    .attr("font-size", 15)
    .attr("font-family", "Comic Sans MS")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)");

  // bind data to the circles which will be generated in the next step
  const rectangles = svgGroup.selectAll("rect").data(dataJson);

  rectangles
    .enter()
    .append("rect")
    .attr("x", (data) => xScale(data.name))
    .attr("y", (data) => yScale(data.height))
    .attr("width", xScale.bandwidth())
    .attr("height", (data) => GROUP_HEIGHT - yScale(data.height))
    .attr("fill", (data, index) => colours(index))
    .attr("stroke-width", 2);

  // bind data to the height labels which will be generated in the next step
  const heightLabels = svgGroup.selectAll("heights").data(dataJson);

  heightLabels
    .enter()
    .append("text")
    // generate label dynamically depending on data associated to it
    .text((data) => data.height)
    .attr("x", (data) => xScale(data.name) + xScale.bandwidth() / 2)
    .attr(
      "y",
      (data) => (GROUP_HEIGHT - yScale(data.height)) / 2 + yScale(data.height)
    )
    .attr("font-size", 15)
    .attr("font-family", "Comic Sans MS")
    .attr("text-anchor", "middle");
})();
