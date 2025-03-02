// Global variables to store data
let uploadedData = null;
let columnTypes = {};
let chart = null;

// DOM Elements
const fileUpload = document.getElementById('file-upload');
const fileNameDisplay = document.getElementById('file-name');
const uploadButton = document.getElementById('upload-btn');
const uploadStatus = document.getElementById('upload-status');
const dataSection = document.getElementById('data-section');
const columnsList = document.getElementById('columns-list');
const chartType = document.getElementById('chart-type');
const xAxisSelect = document.getElementById('x-axis');
const yAxisSelect = document.getElementById('y-axis');
const labelColumnSelect = document.getElementById('label-column');
const valueColumnSelect = document.getElementById('value-column');
const labelGroup = document.getElementById('label-group');
const valueGroup = document.getElementById('value-group');
const xAxisGroup = document.getElementById('x-axis-group');
const yAxisGroup = document.getElementById('y-axis-group');
const generateChartBtn = document.getElementById('generate-chart');
const chartSection = document.getElementById('chart-section');
const chartCanvas = document.getElementById('chart-canvas');

// Event Listeners
fileUpload.addEventListener('change', handleFileSelection);
uploadButton.addEventListener('click', uploadFile);
chartType.addEventListener('change', updateChartOptions);
generateChartBtn.addEventListener('click', generateChart);

// Handle file selection
function handleFileSelection(event) {
    const file = event.target.files[0];
    if (file) {
        fileNameDisplay.textContent = file.name;
        uploadButton.disabled = false;
    } else {
        fileNameDisplay.textContent = 'Choose a file';
        uploadButton.disabled = true;
    }
}

// Upload and process the file
async function uploadFile() {
    const file = fileUpload.files[0];
    if (!file) return;
    
    // Check file extension
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (fileExt !== 'xlsx' && fileExt !== 'csv') {
        uploadStatus.innerHTML = '<span style="color: red;">Error: Please upload an Excel (.xlsx) or CSV (.csv) file.</span>';
        return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    // Update UI
    uploadButton.disabled = true;
    uploadStatus.innerHTML = '<span class="loading">Processing file...</span>';
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.error) {
            uploadStatus.innerHTML = `<span style="color: red;">Error: ${result.error}</span>`;
            uploadButton.disabled = false;
            return;
        }
        
        // Store data and column types
        uploadedData = result.data;
        columnTypes = result.column_types;
        
        // Display columns and their types
        displayColumns(result.columns, result.column_types);
        
        // Populate chart options
        populateColumnSelects(result.columns, result.column_types);
        
        // Show data section
        dataSection.classList.remove('hidden');
        dataSection.classList.add('fadeIn');
        
        // Update status
        uploadStatus.innerHTML = `<span style="color: green;">✓ File processed successfully!</span>`;
        
        // Scroll to data section
        dataSection.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        uploadStatus.innerHTML = `<span style="color: red;">Error: ${error.message}</span>`;
        uploadButton.disabled = false;
    }
}

// Display columns and their types
function displayColumns(columns, types) {
    columnsList.innerHTML = '';
    
    columns.forEach(column => {
        const columnType = types[column];
        const typeLabel = {
            'T': 'Text',
            'N': 'Numeric',
            'TN': 'Text + Numeric',
            'D': 'Date'
        }[columnType];
        
        const columnItem = document.createElement('div');
        columnItem.className = 'column-item';
        columnItem.innerHTML = `
            <span>${column}</span>
            <span class="column-type type-${columnType}">${typeLabel}</span>
        `;
        
        columnsList.appendChild(columnItem);
    });
}

// Populate column selection dropdowns
function populateColumnSelects(columns, types) {
    // Clear existing options
    xAxisSelect.innerHTML = '';
    yAxisSelect.innerHTML = '';
    labelColumnSelect.innerHTML = '';
    valueColumnSelect.innerHTML = '';
    
    // Add options to each select
    columns.forEach(column => {
        const xOption = document.createElement('option');
        xOption.value = column;
        xOption.textContent = column;
        xAxisSelect.appendChild(xOption);
        
        const yOption = document.createElement('option');
        yOption.value = column;
        yOption.textContent = column;
        yAxisSelect.appendChild(yOption);
        
        const labelOption = document.createElement('option');
        labelOption.value = column;
        labelOption.textContent = column;
        labelColumnSelect.appendChild(labelOption);
        
        const valueOption = document.createElement('option');
        valueOption.value = column;
        valueOption.textContent = column;
        valueColumnSelect.appendChild(valueOption);
    });
    
    // Set default Y-axis to first numeric column
    const numericColumns = columns.filter(col => types[col] === 'N');
    if (numericColumns.length > 0) {
        yAxisSelect.value = numericColumns[0];
        valueColumnSelect.value = numericColumns[0];
    }
    
    // Update chart options for initial chart type
    updateChartOptions();
}

// Update chart options based on selected chart type
function updateChartOptions() {
    const selectedType = chartType.value;
    
    if (selectedType === 'pie') {
        // Pie charts need label and value
        xAxisGroup.classList.add('hidden');
        yAxisGroup.classList.add('hidden');
        labelGroup.classList.remove('hidden');
        valueGroup.classList.remove('hidden');
    } else {
        // Bar and line charts need x and y axes
        xAxisGroup.classList.remove('hidden');
        yAxisGroup.classList.remove('hidden');
        labelGroup.classList.add('hidden');
        valueGroup.classList.add('hidden');
    }
}

// Generate the chart
function generateChart() {
    if (!uploadedData || uploadedData.length === 0) return;
    
    const selectedType = chartType.value;
    let chartData, chartOptions;
    
    // Prepare data based on chart type
    if (selectedType === 'pie') {
        const labelColumn = labelColumnSelect.value;
        const valueColumn = valueColumnSelect.value;
        
        [chartData, chartOptions] = preparePieChartData(labelColumn, valueColumn);
    } else {
        const xColumn = xAxisSelect.value;
        const yColumn = yAxisSelect.value;
        
        [chartData, chartOptions] = prepareAxisBasedChartData(selectedType, xColumn, yColumn);
    }
    
    // Show chart section
    chartSection.classList.remove('hidden');
    chartSection.classList.add('fadeIn');
    
    // Scroll to chart section
    chartSection.scrollIntoView({ behavior: 'smooth' });
    
    // Create or update chart
    createChart(selectedType, chartData, chartOptions);
}

// Prepare data for pie chart
function preparePieChartData(labelColumn, valueColumn) {
    // Group by label and sum values
    const groupedData = _.groupBy(uploadedData, labelColumn);
    
    const labels = Object.keys(groupedData);
    const values = labels.map(label => {
        return _.sumBy(groupedData[label], item => parseFloat(item[valueColumn]) || 0);
    });
    
    // Generate random colors
    const colors = generateRandomColors(labels.length);
    
    const chartData = {
        labels: labels,
        datasets: [{
            data: values,
            backgroundColor: colors,
            borderColor: colors.map(color => adjustColorBrightness(color, -0.2)),
            borderWidth: 1
        }]
    };
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right'
            },
            title: {
                display: true,
                text: `${labelColumn} by ${valueColumn}`,
                font: {
                    size: 18
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = Math.round((value / total) * 100);
                        return `${label}: ${value} (${percentage}%)`;
                    }
                }
            }
        },
        animation: {
            animateRotate: true,
            animateScale: true,
            duration: 2000,
            easing: 'easeOutQuart'
        }
    };
    
    return [chartData, chartOptions];
}

// Prepare data for bar and line charts
function prepareAxisBasedChartData(chartType, xColumn, yColumn) {
    // Group by x-axis value and calculate y-axis values
    const groupedData = _.groupBy(uploadedData, xColumn);
    
    const labels = Object.keys(groupedData);
    const values = labels.map(label => {
        return _.meanBy(groupedData[label], item => parseFloat(item[yColumn]) || 0);
    });
    
    // Generate color
    const color = generateRandomColors(1)[0];
    const borderColor = adjustColorBrightness(color, -0.2);
    
    const chartData = {
        labels: labels,
        datasets: [{
            label: yColumn,
            data: values,
            backgroundColor: color,
            borderColor: borderColor,
            borderWidth: 1,
            tension: 0.4,
            fill: chartType === 'line'
        }]
    };
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top'
            },
            title: {
                display: true,
                text: `${yColumn} by ${xColumn}`,
                font: {
                    size: 18
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.dataset.label || '';
                        const value = context.raw.toFixed(2);
                        return `${label}: ${value}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: yColumn
                }
            },
            x: {
                title: {
                    display: true,
                    text: xColumn
                }
            }
        },
        animation: {
            duration: 2000,
            easing: 'easeOutQuart'
        }
    };
    
    return [chartData, chartOptions];
}

// Create or update chart
function createChart(type, data, options) {
    // Destroy existing chart if it exists
    if (chart) {
        chart.destroy();
    }
    
    // Apply 3D effect
    if (type === 'bar') {
        // Add 3D effect for bar charts
        Chart.defaults.elements.bar.borderSkipped = false;
        options.plugins.tooltip.callbacks.beforeLabel = function(context) {
            return '3D View';
        };
        options.borderRadius = 5;
        
        // Increase border width for 3D effect
        data.datasets.forEach(dataset => {
            dataset.borderWidth = 3;
            // Add shadow for 3D effect
            dataset.shadowOffsetX = 3;
            dataset.shadowOffsetY = 3;
            dataset.shadowBlur = 10;
            dataset.shadowColor = 'rgba(0,0,0,0.5)';
        });
    } else if (type === 'pie') {
        // Add 3D effect for pie charts
        options.cutout = '30%'; // Donut style for 3D effect
        options.plugins.tooltip.callbacks.beforeLabel = function(context) {
            return '3D View';
        };
    }
    
    // Create new chart
    chart = new Chart(chartCanvas, {
        type: type,
        data: data,
        options: options,
        plugins: [{
            beforeDraw: function(chart) {
                if (type === 'pie') {
                    // Add shadow for 3D effect
                    const ctx = chart.ctx;
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.shadowBlur = 10;
                    ctx.shadowOffsetX = 5;
                    ctx.shadowOffsetY = 5;
                } else if (type === 'bar') {
                    // Add gradient for 3D effect
                    const ctx = chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, chart.height);
                    gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
                    gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
                    
                    chart.data.datasets.forEach(dataset => {
                        dataset.backgroundColor = dataset.backgroundColor.map(color => {
                            return ctx.createLinearGradient(0, 0, 0, chart.height);
                        });
                        
                        dataset.backgroundColor.forEach(gradient => {
                            gradient.addColorStop(0, adjustColorBrightness(data.datasets[0].backgroundColor, 0.3));
                            gradient.addColorStop(1, adjustColorBrightness(data.datasets[0].backgroundColor, -0.2));
                        });
                    });
                }
            }
        }]
    });
}

// Helper function to generate random colors
function generateRandomColors(count) {
    const colors = [];
    const baseHues = [0, 60, 120, 180, 240, 300]; // Red, Yellow, Green, Cyan, Blue, Magenta
    
    for (let i = 0; i < count; i++) {
        const hue = baseHues[i % baseHues.length] + (Math.random() * 30 - 15);
        const saturation = 70 + Math.random() * 20; // 70-90%
        const lightness = 50 + Math.random() * 10; // 50-60%
        
        colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
    
    return colors;
}

// Helper function to adjust color brightness
function adjustColorBrightness(color, factor) {
    // Extract RGB from color string
    let r, g, b;
    
    if (color.startsWith('#')) {
        // Hex color
        r = parseInt(color.substr(1, 2), 16);
        g = parseInt(color.substr(3, 2), 16);
        b = parseInt(color.substr(5, 2), 16);
    } else if (color.startsWith('rgb')) {
        // RGB color
        const match = color.match(/\d+/g);
        r = parseInt(match[0]);
        g = parseInt(match[1]);
        b = parseInt(match[2]);
    } else if (color.startsWith('hsl')) {
        // For HSL, we'll just darken by returning with opacity
        return color.replace('hsl', 'hsla').replace(')', `, ${1 + factor})`);
    } else {
        return color;
    }
    
    // Adjust brightness
    r = Math.min(255, Math.max(0, Math.round(r + (factor * 255))));
    g = Math.min(255, Math.max(0, Math.round(g + (factor * 255))));
    b = Math.min(255, Math.max(0, Math.round(b + (factor * 255))));
    
    return `rgb(${r}, ${g}, ${b})`;
}

// Add animation to charts
function addChartAnimation() {
    // Add entrance animation for chart elements
    Chart.defaults.animation.duration = 2000;
    Chart.defaults.animation.easing = 'easeOutQuart';
    
    // Add hover animations
    Chart.defaults.elements.bar.hoverBackgroundColor = (context) => {
        return adjustColorBrightness(context.dataset.backgroundColor, 0.1);
    };
    
    Chart.defaults.elements.arc.hoverBackgroundColor = (context) => {
        return adjustColorBrightness(context.dataset.backgroundColor[context.dataIndex], 0.1);
    };
}

// Initialize animations
addChartAnimation();

// Add window load event to handle any initial setup
window.addEventListener('load', function() {
    // Set initial state
    fileNameDisplay.textContent = 'Choose a file';
    uploadButton.disabled = true;
    
    // Make the UI elements appear with animation
    document.querySelector('header').classList.add('fadeIn');
    document.getElementById('upload-section').classList.add('fadeIn');
});