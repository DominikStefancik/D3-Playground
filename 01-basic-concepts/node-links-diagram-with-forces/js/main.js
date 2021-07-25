/////////////////////////////////////////////////////////////////////////
////////////////////// SETTING UP THE VISUALISATION /////////////////////
/////////////////////////////////////////////////////////////////////////

// We don't need axes and axis labels for a node-link diagram, that's why margin is not necessary

const WIDTH = 1200;
const HEIGHT = 700;
const ZONE = {
  WIDTH: WIDTH / 3,
  HEIGHT: HEIGHT / 2,
};
// centres of different part of the canvas
// nodes will gravitate towards these centres depending on the line hey are part of
const ZONE_CENTRE = {
  1: { x: WIDTH / 2, y: HEIGHT / 2 },
  2: { x: WIDTH - ZONE.WIDTH / 2, y: ZONE.HEIGHT / 2 },
  3: { x: WIDTH - ZONE.WIDTH / 2, y: HEIGHT - ZONE.HEIGHT / 2 },
  4: { x: ZONE.WIDTH / 2, y: HEIGHT - ZONE.HEIGHT / 2 },
  6: { x: ZONE.WIDTH / 2, y: ZONE.HEIGHT / 2 },
};

const canvas = d3
  .select("#diagram-area")
  .append("svg")
  .attr("width", WIDTH)
  .attr("height", HEIGHT);

const tooltip = d3
  .tip()
  // this class has to be set, otherwise the tooltip will not be styled and nicely visible
  .attr("class", "d3-tip")
  .html((event, data) => {
    const lineString = Array.from(data.lines).join(", ");

    let text = `<strong>Stop:</strong> <span style="color:red;text-transform:capitalize">${data.id}</span><br />`;
    text += `<strong>Lines:</strong> <span style="color:red">${lineString}</span><br />`;

    return text;
  });

// invoke the tooltip in the context of our visualization
canvas.call(tooltip);

// Force simulation which can set different forces between nodes
const simulation = d3
  .forceSimulation()
  // add force functions to the simulation
  .force(
    "x",
    // the node will gravitate to the "x" position of the zone centre depending on which line it is a part of
    d3.forceX().x((data) => {
      const line = Array.from(data.lines)[0];

      return ZONE_CENTRE[line].x;
    })
  )
  // the node will gravitate to the "y" position of the zone centre depending on which line it is a part of
  .force(
    "y",
    d3.forceY().y((data) => {
      const line = Array.from(data.lines)[0];

      return ZONE_CENTRE[line].y;
    })
  )
  // set how nodes will attract (positive value) or repel (negative value) each other
  .force("charge", d3.forceManyBody().strength(-70))
  // makes sure that the nodes will not overlap when rendered on the screen
  // the argument is the length of the radius at which the nodes should not collide
  .force("collide", d3.forceCollide(10).strength(0.8))
  // force nodes to be a certain distance apart from each other
  .force(
    "link",
    // with the "id()" method we say that a particular node from the "nodes" array should be found by its id
    d3.forceLink().id((data) => data.id)
  );

//////////////////////////////////////////////////////////////////////////
////////////////////// EVENT HANDLERS FOR SIMULATION /////////////////////
//////////////////////////////////////////////////////////////////////////

// this function runs for every tick of the simulation
// it updates position of circles and lines by setting their "x" and "y" attributes
const updateNodesAndLinks = (svgNodes, svgLines) => {
  svgNodes.attr("cx", (node) => node.x).attr("cy", (node) => node.y);

  svgLines
    .attr("x1", (link) => link.source.x)
    .attr("y1", (link) => link.source.y)
    .attr("x2", (link) => link.target.x)
    .attr("y2", (link) => link.target.y);
};

const dragStarted = (event, circle) => {
  // before you start dragging, hide tooltip
  tooltip.hide();

  // calling "alphaTarget().restart()" restarts the simulation whenever a node gets dragged
  // the "alpha" of the simulation represents how tempered all of the forces should be
  if (!event.active) {
    simulation.alphaTarget(0.3).restart();
  }

  circle.fx = circle.x;
  circle.fy = circle.y;
};

const drag = (event, circle) => {
  circle.fx = event.x;
  circle.fy = event.y;
};

const dragEnded = (event, circle) => {
  if (!event.active) {
    // after we finish dragging, we set the simulation to stop again
    simulation.alphaTarget(0);
  }

  // set the force value of "x" and "y" to null, so the node doesn't stay pegged to the position of the mouse cursor
  circle.fx = null;
  circle.fy = null;
};

////////////////////////////////////////////////////////////////////////
////////////////////// RENDERING THE VISUALISATION /////////////////////
////////////////////////////////////////////////////////////////////////

const showDiagram = (data) => {
  // we want to render links before nodes, so the nodes will overlap the end of the links
  // so it will look like a link ends at the circle's border and NOT in its centre
  //
  // add line for every link
  const links = canvas
    .selectAll("line")
    .data(data.links)
    // for each link from our data, render a line
    .enter()
    // we don't set here the "x" and "y" attributes because they will be set in the every "tick" of the simulation
    .append("line")
    .attr("stroke", (data) => data.color);

  // we don't set here the "cx", "cy" attributes because they will be set on the every "tick" of the simulation
  const nodes = canvas
    .selectAll("circle")
    .data(data.nodes)
    .enter()
    .append("circle")
    .attr("r", (data) => data.lines.size * 7)
    .on("mouseover", tooltip.show)
    .on("mouseout", tooltip.hide)
    // allow dragging nodes on the canvas
    .call(
      d3
        .drag()
        .on("start", (mouseEvent, data) => dragStarted(mouseEvent, data))
        .on("end", (mouseEvent, data) => dragEnded(mouseEvent, data))
        .on("drag", (mouseEvent, data) => drag(mouseEvent, data))
    );

  simulation
    // attach nodes to the simulation
    .nodes(data.nodes)
    // create an event handler to update SVG positions after every "tick" of the time while the simulation runs
    .on("tick", () => {
      updateNodesAndLinks(nodes, links);
    });

  // attach links to the simulation
  simulation.force("link").links(data.links);
};

//////////////////////////////////////////////////////////////////////////////
////////////////////// LOADING AND TRANSFORMING THE DATA /////////////////////
//////////////////////////////////////////////////////////////////////////////

(async () => {
  const loadedData = await d3.csv("data/vienna-subway.csv");

  const startStations = loadedData.map((row) => row.start);
  const endStations = loadedData.map((row) => row.stop);
  const allStations = new Set(startStations.concat(endStations));

  const nodes = Array.from(allStations).map((station) => ({
    id: station,
    lines: new Set(),
  }));

  // the simulation expects nodes as an array of objects
  nodes.forEach((station) => {
    // this is not the most efficient way to assign lines to nodes (O(n x m) complexity)
    // but the data is not so big, so we can live with it
    loadedData.forEach((row) => {
      if (row.start === station.id || row.stop === station.id) {
        station.lines.add(row.line);
      }
    });
  });

  // the simulation expects links as an array of objects with mandatory fields "source" and "target"
  const links = loadedData.map((row) => ({
    source: row.start,
    target: row.stop,
    line: row.line,
    color: row.color,
  }));

  const data = {
    nodes,
    links,
  };

  showDiagram(data);
})();
