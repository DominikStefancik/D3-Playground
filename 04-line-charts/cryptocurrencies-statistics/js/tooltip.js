const createTooltip = (chartData) => {
  const {
    parentGroup,
    data,
    yParameter,
    height,
    width,
    xScale,
    yScale,
    bisectDate,
  } = chartData;

  // remove previously rendered tooltip
  d3.select(".chartTooltip").remove();
  d3.select(".overlay").remove();

  const tooltipGroup = parentGroup
    .append("g")
    // NOTE: naming the class "tooltip" will NOT show the tooltip on the screen
    // because the name is already used by the Bootstrap library
    .attr("class", "chartTooltip")
    .style("display", "none");

  // vertical line connecting to the X-axis
  tooltipGroup
    .append("line")
    .attr("class", "x-hover-line hover-line")
    .attr("y1", 0)
    .attr("y2", height);

  // horizontal line connecting to the Y-axis
  tooltipGroup
    .append("line")
    .attr("class", "y-hover-line hover-line")
    .attr("x1", 0)
    .attr("x2", width);

  tooltipGroup.append("circle").attr("r", 7.5);

  tooltipGroup.append("text").attr("x", 15).attr("dy", ".31em");

  // an invisible rectangle used as an overlay which will react to the mouse cursor movements
  // it has the same width and height as the chart
  parentGroup
    .append("rect")
    .attr("class", "overlay")
    .attr("width", width)
    .attr("height", height)
    // whenever we hover over inside the chart area, the tooltip is shown
    .on("mouseover", () => tooltipGroup.style("display", null))
    // whenever we hover over outside of the chart area, the tooltip is hidden
    .on("mouseout", () => tooltipGroup.style("display", "none"))
    // update each part of the tooltip when mouse moves
    .on("mousemove", (event) => mouseMove(event));

  const mouseMove = (mouseEvent) => {
    // find time value depending on X-coordinate of the mouse pointer
    const pointerX = xScale.invert(d3.pointer(mouseEvent)[0]);

    // return the index of the data array where time value would belong if it was its own data point
    const index = bisectDate(data, pointerX, 1);
    const data0 = data[index - 1];
    // sometimes when the cursor is on the very right edge of the chart, "data1" can be undefined
    const data1 = data[index];

    // compare the date the mouse pointer points to,
    // to two closest date values in the array and returns the closest data point
    const pointedData =
      !!data1 && pointerX - data0.date > data1.date - pointerX ? data1 : data0;

    tooltipGroup.attr(
      "transform",
      `translate(${xScale(pointedData.date)}, ${yScale(
        pointedData[yParameter]
      )})`
    );
    tooltipGroup.select("text").text(pointedData[yParameter]);
    tooltipGroup
      .select(".x-hover-line")
      .attr("y2", height - yScale(pointedData[yParameter]));
    tooltipGroup.select(".y-hover-line").attr("x2", -xScale(pointedData.date));
  };
};
