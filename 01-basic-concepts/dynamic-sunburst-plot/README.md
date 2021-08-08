# Dynamic Sunburst Plot

A dynamic sunburst plot showing world population in 2020 divided into continents, regions and countries. The nodes of the plot rendered as circle arcs represent either the whole world, a continent, a region or a country.
Each layer of the plot represent the world as whole, i.e. the centre represents the world itself, the next layer represents all continents, then regions and the last layer represents the countries of the world.
The continents, regions and countries belonging to the same group have the same colour where the outer layers have the lighter colour as the layer closer to the centre them.
The detailed information about each arc is provided as a tooltip.

The code with supplementary comments shows how to render a sunburst plot in D3 with possibility to set up transitions between different sizes for each arc of the plot.
