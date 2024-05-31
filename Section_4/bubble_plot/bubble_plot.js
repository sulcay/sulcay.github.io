const container = d3.select("#my_dataviz").node();

// Get the width and height of the container
const width = container.clientWidth;  // Use 100% of the container width
const height = container.clientHeight; // Use 100% of the container height

const margin = { top: 0, right: 0, bottom: 10, left: 0 }; // Define margins for axes and labels

// Adjust width and height to account for margins
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

// Create an SVG element with adjusted dimensions
let svg = d3.select("#my_dataviz")
  .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);  // Offset the group element by the margins


let node;
let simulation;
var xScale, yScale, color, size, yAxis;

// Container for nodes
let nodeG = svg.append("g")
  .attr("class", "nodes");

let allData = [];
let dataSubset = [];
let dataBeingUsed = [];

// Function to get a random subset of data
function getRandomSubset(data, size = 300) {
    const shuffled = data.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, size);
}

// Load data and initialize plot
d3.csv("short_wines.csv").then(function(data) {
    data.forEach(d => {
        d.price = +d.price;
        d.points = +d.points;
    });

    allData = data.map(d => ({
        ...d,
        price: +d.price,
        points: +d.points
    }));

    // Select a random subset of 100 wines to display initially
    dataSubset = getRandomSubset(allData);
    initializePlot(dataSubset);  // Call function to create the plot with initial subset
    setupSliders(); // Initialize sliders after data is ready
});

function initializePlot(data) {
    nodeG.selectAll("*").remove(); // Clear the previous plot

    // If length data > 300, getRandomSubset
    if (data.length > 300) {
        data = getRandomSubset(data);
    }

    dataBeingUsed = data; // Store the data being used for filtering

    // Previous code for setting up colors, sizes, tooltip, etc.
    color = d3.scaleSequential(d3.interpolateRdYlGn)
        .domain(d3.extent(data, d => d.points));  // Dynamically set the domain to the lowest and highest scores

    const maxRadius = 10;  // Maximum node radius
    size = d3.scaleLog()
        .domain([Math.max(0.1, d3.max(data, d => d.price)), d3.min(data, d => d.price)])
        .range([3, maxRadius])
        .clamp(true);

        

    // Scales for the position of nodes
    xScale = d3.scaleLog()
        .domain(d3.extent(data, d => d.price))
        .range([0.07*innerWidth + maxRadius, innerWidth - 0.05*innerWidth - maxRadius]); // Adjusted for max node radius

    yScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.points))
        .range([innerHeight - 0.05*innerHeight - maxRadius, 0 + maxRadius]); // Inverted and adjusted for max node radius

    svg.selectAll(".x-axis").remove();
    svg.selectAll(".y-axis").remove();
    
    // Create and append new x-axis
    const xAxis = d3.axisBottom(xScale)
        .ticks(5, "~s")  // Reduced number of ticks for better readability
        .tickFormat(d => `$${d.toLocaleString()}`); // Simplified tick formatting

    const xAxisG = svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${innerHeight - 40})`)
        .call(xAxis);

    // Rotate x-axis tick labels for better readability
    xAxisG.selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-0.8em")
        .attr("dy", "0.15em")
        .attr("transform", "rotate(-35)");

    // Create and append new y-axis
    yAxis = d3.axisLeft(yScale)
        .ticks(5) // Reduced number of ticks for better readability
        .tickFormat(d => `${d} pts`); // Custom formatting for clarity

    // Enter nodes
    enterNodes(data);
    
}



function enterNodes(data) {
    // Append y-axis to the SVG
    svg.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(40,0)`)
        .call(yAxis);

    var tooltip = d3.select("#tooltip");

    var mouseover = function(event, d) {
        // Get the dimensions of the viewport
        var screenWidth = window.innerWidth;
        var screenHeight = window.innerHeight;
        var tooltipWidth = tooltip.node().getBoundingClientRect().width;
        var tooltipHeight = tooltip.node().getBoundingClientRect().height;

        // Set tooltip horizontal position to always be to the right of the cursor
        var tooltipX = event.pageX + 20; // Offset by 20px to avoid overlapping the cursor
        if (tooltipX + tooltipWidth > screenWidth) {
            // If the tooltip would go out of the screen to the right, adjust it to the left of the cursor
            tooltipX = event.pageX - tooltipWidth - 20;
        }

        // Set tooltip vertical position
        var tooltipY = event.pageY + 20; // Offset slightly below the cursor
        if (tooltipY + tooltipHeight > screenHeight) {
            // If the tooltip would go out of the screen at the bottom, adjust it above the cursor
            tooltipY = event.pageY - tooltipHeight - 20;
        }

        tooltip.style("opacity", 1)
               .style("left", tooltipX + "px")
               .style("top", tooltipY + "px");

        // Update tooltip content
        tooltip.select("#tooltip-title").html(`${d.title}`);
        tooltip.select("#tooltip-winery").html(`<strong>Winery:</strong> ${d.winery}`);
        tooltip.select("#tooltip-country").html(`<strong>Country:</strong> ${d.country}`);
        tooltip.select("#tooltip-province").html(`<strong>Province:</strong> ${d.province}`);
        tooltip.select("#tooltip-price").html(`<strong>Price:</strong> $${d.price}`);
        tooltip.select("#tooltip-points").html(`<strong>Points:</strong> ${d.points}`);
        tooltip.select("#tooltip-variety").html(`<strong>Variety:</strong> ${d.variety}`);
        tooltip.select("#tooltip-designation").html(`<strong>Designation:</strong> ${d.designation}`);
        tooltip.select("#tooltip-description").html(`<strong>Description:</strong> ${d.description}`);

        d3.select(this)
            .style("stroke", "black")
            .style("stroke-width", 2.5);
    };

    var mouseleave = function(event, d) {
        tooltip.style("opacity", 0);
        d3.select(this)
            .style("stroke", "black")
            .style("stroke-width", 1);
    };

    // INSERT NODES
    // --------------------
    node = nodeG.selectAll("circle").data(data, d => d.id || d.winery + d.title);

    // Exit and remove old elements not present in new data
    node.exit().remove();
    
    // Enter new elements
    const nodeEnter = node.enter().append("circle")
        .attr("cx", d => xScale(d.price)) // Position according to price
        .attr("cy", d => yScale(d.points)) // Position according to points
        .style("stroke", "black")
        .style("stroke-width", 1)
        .on("mouseover", mouseover)
        .on("mouseleave", mouseleave)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    node = nodeEnter.merge(node)
        .attr("r", d => size(d.price))
        .style("fill", d => color(d.points))  // Use the color scale based on points
        .style("fill-opacity", 0.9);

    // DRAGGING CIRCLES
    // --------------------
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        // Optionally comment out the next two lines to let the node float freely after drag
        d.fx = null;
        d.fy = null;
    }
    
    data.forEach(d => {
        d.fx = xScale(d.price); // Fix nodes horizontally
        d.fy = yScale(d.points); // Fix nodes vertically
        delete d.fx;
        delete d.fy;

    });

    // Initialize simulation with data
    startSimulation(data, size);

}







function startSimulation(data, size) {
    if (simulation) {
        simulation.stop(); // Stops the current simulation if it's running
    }

    simulation = d3.forceSimulation(data)
        .force("center", d3.forceCenter(innerWidth / 2, innerHeight / 2))
        .force("x", d3.forceX(d => xScale(d.price)).strength(0.1))
        .force("y", d3.forceY(d => yScale(d.points)).strength(0.1))
        .force("charge", d3.forceManyBody().strength(0.1))
        .force("collide", d3.forceCollide().radius(d => size(d.price) + 1))
        .on("tick", ticked);

    // Optional: Remove center force, or use it conditionally
    simulation.force("center", null); // If you don't want nodes to gravitate towards center

    function ticked() {
        node
            .attr("cx", d => Math.max(40 + size(d.price), Math.min(innerWidth - 40 - size(d.price), d.x)))
            .attr("cy", d => Math.max(5 + size(d.price), Math.min(innerHeight - 40 - size(d.price), d.y)));
    }
}




// RESET FILTER
document.addEventListener('DOMContentLoaded', function() {
    var removeFilterButton = document.getElementById('removeFilterButton');
    removeFilterButton.addEventListener('click', removeFilter);
});

function removeFilter() {
    // Redraw the plot with all the data
    console.log(`Width: ${innerWidth}, Height: ${innerHeight}`);
    initializePlot(dataSubset);
    resetSliders();
    clearWineryDetailPanel();
    deleteWordCloud();
    deleteBoxPlotScores();
    deleteBoxPlotPrices();
}



// RESET AND SHUFFLE
document.addEventListener('DOMContentLoaded', function() {
    var resetShuffleButton = document.getElementById('resetShuffleButton');
    resetShuffleButton.addEventListener('click', resetShuffle);
});

function resetShuffle() {
    // Redraw the plot with all the data
    dataSubset = getRandomSubset(allData);
    initializePlot(dataSubset);
    resetSliders();
    clearWineryDetailPanel();
    deleteWordCloud();
    deleteBoxPlotScores();
    deleteBoxPlotPrices();
}























const userCardTemplate = document.querySelector("[data-user-template]");
const userCardContainer = document.querySelector("[data-user-cards-container]");
const searchInput = document.querySelector("[data-search]");

let users = [];
let hideDropdownTimer;



  searchInput.addEventListener("input", e => {
    const value = e.target.value.toLowerCase();
    userCardContainer.innerHTML = '';  // Clear previous results
    let count = 0;  // Initialize counter for displayed cards

    users.forEach(user => {
        const isVisible = user.name.toLowerCase().includes(value);
        if (isVisible && count < 15) {
            const card = user.element.cloneNode(true);  // Clone the element to add to the container
            card.addEventListener('click', () => {
                console.log(`Card for winery ${user.name} clicked`);
                selectWinery(user.name);
            });
            userCardContainer.append(card);
            count++;
        }
    });

    if (count === 0) {
        userCardContainer.style.display = 'none';
    } else {
        userCardContainer.style.display = 'block';
    }
});








function selectWinery(wineryName) {
    console.log(`Selecting winery: ${wineryName}`);
    const wineryInfo = users.find(user => user.name === wineryName);
    console.log('Winery Info:', wineryInfo);

    if (wineryInfo) {
        document.getElementById('wineryDetailContainer').style.display = '';
        document.getElementById('messageContainer').style.display = 'none';

        const filteredData = allData.filter(d => d.winery.toLowerCase() === wineryName.toLowerCase());

        updateWineryDetailPanel(wineryInfo.data, filteredData);
        resetSliders(filteredData); // Reset sliders to show all data

        // list of descriptions of filteredData
        const descriptions = filteredData.map(d => d.description);
        console.log('Descriptions:', descriptions);
        console.log('Filtered Wine Data:', filteredData);
        if (filteredData.length > 0) {
            initializePlot(filteredData);
        } else {
            nodeG.selectAll("*").remove(); // Remove all circles if no data matches
            if (simulation) simulation.stop(); // Stop the simulation if no data
        }
    } else {
        clearWineryDetailPanel();
    }
}





// Function to update the winery details panel

// Function to update the winery details panel
function updateWineryDetailPanel(row, filteredData) {
    const prices = Array.isArray(row.prices) ? row.prices : row.prices.replace(/[{}]/g, "").split(",").map(price => parseFloat(price.trim()));
    const scores = Array.isArray(row.scores) ? row.scores : row.scores.replace(/[{}]/g, "").split(",").map(score => parseInt(score.trim()));

    // Rest of the code to update details panel
    document.getElementById('wineryName').textContent = row.winery;
    document.getElementById('countries').textContent = row.country.replace(/[{}'"]/g, "").split(",").map(c => c.trim()).join(", ");
    document.getElementById('provinces').textContent = row.provinces.replace(/[{}'"]/g, "").split(",").map(p => p.trim()).join(", ");
    document.getElementById('designations').textContent = row.designations.join(", ");
    document.getElementById('varieties').textContent = row.varieties.join(", ");
    document.getElementById('numWines').textContent = row.num_wines;

    // Generate charts for prices and scores
    generateBoxPlotPrices('priceChart', 'Prices', prices, 'rgba(255, 99, 132, 0.5)', 'rgba(255, 99, 132, 1)');
    generateBoxPlotScores('scoreChart', 'Scores', scores, 'rgba(54, 162, 235, 0.5)', 'rgba(54, 162, 235, 1)');

    // Word Cloud
    generateWordCloud(filteredData);
}








let boxPlotChartPrices = null;

function generateBoxPlotPrices(canvasId, label, data, backgroundColor, borderColor) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    console.log('Generating box plot for:', data);

    if (data.length < 3) {
        console.log('Box plot displayed if at least 3 different scores.');
        document.getElementById('messagePrice').style.display = 'block';
        deleteBoxPlotPrices();
        return;
    }

    document.getElementById('messagePrice').style.display = 'none';

    // Calculate reasonable limits for the axes
    const dataMin = Math.min(...data);
    const dataMax = Math.max(...data);
    const buffer = (dataMax - dataMin) * 0.02;  // Add 2% buffer to min and max for better visualization

    // Delete the previous box plot chart if it exists
    deleteBoxPlotPrices();

    // Create the box plot chart
    boxPlotChartPrices = new Chart2(ctx, {
        type: 'horizontalBoxplot',  // Using horizontal boxplot type from the plugin
        data: {
            labels: [label],
            datasets: [{
                label: label,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 1,
                outlierColor: '#999999',
                data: [data],
                barPercentage: 0.5, // Reduce the bar width
                categoryPercentage: 0.5 // Reduce the category width
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,  // Maintain the aspect ratio to control height
            legend: {
                display: false  // Remove the legend
            },
            scales: {
                xAxes: [{  // Now using xAxes because the box plot is horizontal
                    ticks: {
                        beginAtZero: true,
                        min: dataMin - buffer,
                        max: dataMax + buffer,
                        padding: 5,  // Reduce the padding between ticks and chart
                        callback: function(value, index, values) {
                            // Skip the first and last ticks
                            if (index === 0 || index === values.length - 1) {
                                return '';
                            }
                            return value;
                        }
                    },
                    gridLines: {
                        display: false
                    }
                }],
                yAxes: [{  // Adjust settings for y axis as this is now the category axis
                    gridLines: {
                        display: false
                    },
                    ticks: {
                        padding: -5  // Reduce the padding between ticks and chart
                    }
                }]
            },
            layout: {
                padding: {
                    left: 5,
                    right: 5,
                    top: 0,  // No top padding
                    bottom: 0 // No bottom padding
                }
            }
        }
    });
}

function deleteBoxPlotPrices() {
    if (boxPlotChartPrices) {
        boxPlotChartPrices.destroy();
        boxPlotChartPrices = null;
    }
}


let boxPlotChartScores = null;

function generateBoxPlotScores(canvasId, label, data, backgroundColor, borderColor) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    if (data.length < 3) {
        console.log('Box plot displayed if at least 3 different scores.');
        document.getElementById('messageScore').style.display = 'block';
        deleteBoxPlotScores();
        return;
    }

    document.getElementById('messageScore').style.display = 'none';

    // Calculate reasonable limits for the axes
    const dataMin = Math.min(...data);
    const dataMax = Math.max(...data);
    const buffer = (dataMax - dataMin) * 0.02;  // Add 2% buffer to min and max for better visualization

    // Delete the previous box plot chart if it exists
    deleteBoxPlotScores();

    // Create the box plot chart
    boxPlotChartScores = new Chart2(ctx, {
        type: 'horizontalBoxplot',  // Using horizontal boxplot type from the plugin
        data: {
            labels: [label],
            datasets: [{
                label: label,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 1,
                outlierColor: '#999999',
                data: [data],
                barPercentage: 0.5, // Reduce the bar width
                categoryPercentage: 0.5 // Reduce the category width
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,  // Maintain the aspect ratio to control height
            legend: {
                display: false  // Remove the legend
            },
            scales: {
                xAxes: [{  // Now using xAxes because the box plot is horizontal
                    ticks: {
                        beginAtZero: true,
                        min: dataMin - buffer,
                        max: dataMax + buffer,
                        padding: 5,  // Reduce the padding between ticks and chart
                        callback: function(value, index, values) {
                            // Skip the first and last ticks
                            if (index === 0 || index === values.length - 1) {
                                return '';
                            }
                            return value;
                        }
                    },
                    gridLines: {
                        display: false
                    }
                }],
                yAxes: [{  // Adjust settings for y axis as this is now the category axis
                    gridLines: {
                        display: false
                    },
                    ticks: {
                        padding: -5  // Reduce the padding between ticks and chart
                    }
                }]
            },
            layout: {
                padding: {
                    left: 5,
                    right: 5,
                    top: 0,  // No top padding
                    bottom: 0 // No bottom padding
                }
            }
        }
    });
}

function deleteBoxPlotScores() {
    if (boxPlotChartScores) {
        boxPlotChartScores.destroy();
        boxPlotChartScores = null;
    }
}






























// Function to clear the winery details panel
function clearWineryDetailPanel() {
    document.getElementById('wineryDetailContainer').style.display = 'none';
    document.getElementById('messageContainer').style.display = '';
    deleteWordCloud();
    deleteBoxPlotScores();
    deleteBoxPlotPrices();
    // Clear content from details panel elements
    document.getElementById('wineryName').textContent = '';
    document.getElementById('countries').textContent = '';
    document.getElementById('provinces').textContent = '';
    document.getElementById('designations').textContent = '';
    document.getElementById('varieties').textContent = '';
    document.getElementById('numWines').textContent = '';
}

window.onload = function() {
    clearWineryDetailPanel(); // Call this function on page load to set initial state
}














// Close the dropdown when clicking outside of the input box
document.addEventListener('click', function(event) {
    const isClickInside = searchInput.contains(event.target) || userCardContainer.contains(event.target);
    if (!isClickInside) {
        userCardContainer.style.display = 'none';
    }
});

// Event listener for focus
searchInput.addEventListener("focus", () => {
  if (searchInput.value) { // Only display dropdown if there's something in the input
    userCardContainer.style.display = 'block';
  }
});

// Event listener for blur
searchInput.addEventListener("blur", () => {
  // Use a timeout to delay hiding to allow for click events on dropdown items
  hideDropdownTimer = setTimeout(() => {
    userCardContainer.style.display = 'none';
  }, 200); // Short delay to catch click events on dropdown items
});




let allWineries = [];

d3.csv("wineries_info.csv").then(data => {
    allWineries = data.map(d => {

        const card = userCardTemplate.content.cloneNode(true).children[0];
        const header = card.querySelector("[data-header]");
        const subtext = card.querySelector("[data-subtext]");

        header.textContent = d.winery;

        // Extract and clean up countries
        let countries = d.country.replace(/[{}'"]/g, "").split(",");
        countries = countries.map(country => country.trim());
        if (countries.length > 10) {
          countries = countries.slice(0, 10);
        }
        subtext.textContent = countries.join(", ");
        subtext.style.color = 'lightgray';

        // Parse prices and scores arrays
        const prices = d.prices.replace(/[{}]/g, "").split(",").map(price => parseFloat(price.trim()));
        const scores = d.scores.replace(/[{}]/g, "").split(",").map(score => parseInt(score.trim()));

        // Extract and clean up designations and varieties
        let designations = d.designations.replace(/[{}'"]/g, "").split(",").map(designation => designation.trim());
        let varieties = d.varieties.replace(/[{}'"]/g, "").split(",").map(variety => variety.trim());

        const parsedData = {
            ...d,
            prices: prices,
            scores: scores,
            designations: designations,
            varieties: varieties,
            num_wines: parseInt(d.num_wines)
        };

        return {
            name: d.winery,
            element: card,
            data: parsedData
        }; // Store card element and parsed data in the user object
    });

    users = allWineries; // Set users to allWineries after parsing
}).catch(error => console.error("Error fetching data:", error));


















// WORD CLOUD


let wordCloudChart = null;

function generateWordCloud(data) {
    console.log('Generating word cloud for:', data);

    if (data.length < 3) {
        console.log('Not enough data to generate word cloud.');
        document.getElementById('messageCloud').style.display = 'block';
        deleteWordCloud();
        return;
    }

    document.getElementById('messageCloud').style.display = 'none';

    // Access the canvas element and its size
    const canvasElement = document.getElementById("wordCloud");
    const ctx = canvasElement.getContext("2d");

    let wordCounts = {};
    const customStopWords = ['its', 'drink', 'wine', 'winery', 'wines', 'wineries', 'shows', 'show', 'price', 'body', 'bodied', 'may', 'flavor', 'flavors', 'aroma', 'aromas', 'finish'];

    // Process each item's description
    data.forEach(item => {
        let words = item.description.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").toLowerCase().split(" ");
        let filteredWords = sw.removeStopwords(words); // Ensure `sw` is defined or imported correctly

        // Count each word's frequency
        filteredWords.forEach(word => {
            if (!customStopWords.includes(word) && word.length > 1) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
        });
    });

    console.log('Word counts:', wordCounts);

    // Step 1: Sort the entries by their values in descending order
    const sortedEntries = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);

    // Step 2: Select the top 50 entries
    const topEntries = sortedEntries.slice(0, 50);

    // Step 3: Create a new object with the top 50 entries
    const topWordCounts = Object.fromEntries(topEntries);

    // Step 4: Define the desired output range
    const minRange = 10;
    const maxRange = 30;

    // Step 5: Extract the values
    const values = Object.values(topWordCounts);

    // Step 6: Compute the logarithm of each value
    const logValues = values.map(value => Math.log(value));

    // Step 7: Find the min and max of the logarithmic values
    const minLogValue = Math.min(...logValues);
    const maxLogValue = Math.max(...logValues);

    // Step 8: Normalize the log values to a 0-1 range
    const normalizedLogValues = logValues.map(logValue => (logValue - minLogValue) / (maxLogValue - minLogValue));

    // Step 9: Scale the normalized values to the desired range (25 to 50)
    const scaledValues = normalizedLogValues.map(normValue => minRange + normValue * (maxRange - minRange));

    // Step 10: Create a new object with the scaled values
    const scaledWordCounts = {};
    Object.keys(topWordCounts).forEach((key, index) => {
        scaledWordCounts[key] = scaledValues[index];
    });

    console.log(scaledWordCounts);

    // Convert word counts to an array, sort by frequency, and take the top 20
    const words = Object.entries(scaledWordCounts)
        .map(([key, value]) => ({ text: key, size: value }))
        .sort((a, b) => b.size - a.size);

    console.log('Top words:', words.map(word => word.text));
    console.log('Word sizes:', words.map(word => word.size));

    // Delete the previous word cloud chart if it exists
    deleteWordCloud();

    // Create the word cloud chart
    wordCloudChart = new Chart(ctx, {
        type: 'wordCloud',
        data: {
            labels: words.map(word => word.text),
            datasets: [{
                label: 'Word Frequency',
                data: words.map(word => word.size), // Size represents font size in pixels
            }]
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });
}

function deleteWordCloud() {
    if (wordCloudChart) {
        wordCloudChart.destroy();
        wordCloudChart = null;
    }
}


















// SLIDERS
// --------------------

// Function to setup sliders with optimized event handling
function setupSliders() {
    if (!dataBeingUsed || dataBeingUsed.length === 0) {
        console.error('No data available to setup sliders.');
        return;
    }

    // Calculate and cache the price and points ranges
    const priceRange = calculateRange(dataBeingUsed, 'price');
    const pointsRange = calculateRange(dataBeingUsed, 'points');

    // Setup price slider with updated display elements
    setupSlider('priceSlider', priceRange, (values) => {
        document.getElementById('priceMin').textContent = `Price:     $${parseInt(values[0])}`;
        document.getElementById('priceMax').textContent = `$${parseInt(values[1])}`;
        applyFilters();
    });

    // Setup points slider with updated display elements
    setupSlider('pointsSlider', pointsRange, (values) => {
        document.getElementById('pointsMin').textContent = `Points:     ${parseInt(values[0])}`;
        document.getElementById('pointsMax').textContent = `${parseInt(values[1])}`;
        applyFilters();
    });
}

// Helper function to setup individual slider
function setupSlider(elementId, range, onUpdate) {
    const sliderElement = document.getElementById(elementId);
    if (sliderElement.noUiSlider) {
        sliderElement.noUiSlider.destroy();
    }

    // Ensure range values are numeric
    if (isNaN(range.min) || isNaN(range.max)) {
        console.error(`Invalid range for ${elementId}:`, range);
        return;
    }

    noUiSlider.create(sliderElement, {
        start: [range.min, range.max],
        connect: true,
        step: 1,
        range: {
            'min': range.min,
            'max': range.max
        }
        // format: wNumb({
        //     decimals: 0 // Ensures no decimals
        // })
    });
    sliderElement.noUiSlider.on('update', onUpdate);
}

// Helper function to calculate min and max range for a given field
function calculateRange(data, field) {
    const values = data.map(item => item[field]).filter(value => !isNaN(value)); // Filter out non-numeric values
    return {
        min: Math.min(...values),
        max: Math.max(...values)
    };
}

// Function to apply filters and update plot based on slider values
function applyFilters() {
    const priceSliderElement = document.getElementById('priceSlider');
    const pointsSliderElement = document.getElementById('pointsSlider');

    if (!priceSliderElement || !priceSliderElement.noUiSlider || !pointsSliderElement || !pointsSliderElement.noUiSlider) {
        console.error('Sliders not initialized correctly.');
        return;
    }

    const priceValues = priceSliderElement.noUiSlider.get();
    const pointsValues = pointsSliderElement.noUiSlider.get();
    const priceMin = parseInt(priceValues[0], 10);
    const priceMax = parseInt(priceValues[1], 10);
    const pointsMin = parseInt(pointsValues[0], 10);
    const pointsMax = parseInt(pointsValues[1], 10);

    const filteredData = dataBeingUsed.filter(d => {
        return d.price >= priceMin && d.price <= priceMax &&
               d.points >= pointsMin && d.points <= pointsMax;
    });

    enterNodes(filteredData);
}



function resetSliders(dataReset = dataBeingUsed) {

    if (dataReset.length < 2) {
        console.error('No data available to reset sliders.');
        return;
    }

    const priceRange = calculateRange(dataReset, 'price');
    const pointsRange = calculateRange(dataReset, 'points');
    console.log('Data being used:', dataReset);

    updateSlider('priceSlider', priceRange);
    updateSlider('pointsSlider', pointsRange);
}

function updateSlider(elementId, range) {
    var slider = document.getElementById(elementId).noUiSlider;
    slider.updateOptions({
        range: {
            'min': range.min,
            'max': range.max
        }
    }, true); // True to reset the slider handles as well
    slider.set([range.min, range.max]);
}
