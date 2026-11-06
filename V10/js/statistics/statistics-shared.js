/**
 * Statistics: shared legend and download helpers
 *
 * Purpose : Class-colour legend for the pie charts, plus the single CSV / PNG download handlers used by every statistics tab.
 * Depends : Chart.js. Must load before the per-tab statistics files.
 * Exposes : renderStatisticsLegend(items), downloadStatisticsCsv(), downloadStatisticsChart()
 */

function renderStatisticsLegend(items) {
    const legend = document.getElementById('statisticsLegend');
    if (!legend) return;

    legend.replaceChildren();
    const table = document.createElement('table');
    const headerRow = document.createElement('tr');
    ['', 'Class'].forEach((label) => {
        const header = document.createElement('th');
        header.textContent = label;
        headerRow.appendChild(header);
    });
    const thead = document.createElement('thead');
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    items.forEach(({ label, color }) => {
        const row = document.createElement('tr');
        const colorCell = document.createElement('td');
        const swatch = document.createElement('span');
        swatch.className = 'soil-legend-swatch';
        swatch.style.backgroundColor = color || '#808080';
        colorCell.appendChild(swatch);

        const labelCell = document.createElement('td');
        labelCell.textContent = label;
        row.appendChild(colorCell);
        row.appendChild(labelCell);
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    legend.appendChild(table);
    legend.style.display = items.length ? 'block' : 'none';
}

function downloadStatisticsChart() {
    const chartCanvas = document.getElementById('areaPieChart');
    if (!chartCanvas || chartCanvas.width === 0 || chartCanvas.height === 0) {
        alert('No chart to download.');
        return;
    }

    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = chartCanvas.toDataURL('image/png');
    link.download = `statistics_chart_${stamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadStatisticsCsv() {
    const activeChart = window.Chart && typeof Chart.getChart === 'function'
        ? Chart.getChart('areaPieChart')
        : null;

    if (!activeChart
        || !activeChart.data
        || !Array.isArray(activeChart.data.labels)
        || !activeChart.data.datasets
        || !activeChart.data.datasets[0]
        || !Array.isArray(activeChart.data.datasets[0].data)
        || activeChart.data.labels.length === 0
        || activeChart.data.datasets[0].data.length === 0) {
        alert('No data available to download.');
        return;
    }

    const labels = activeChart.data.labels;
    const values = activeChart.data.datasets[0].data;
    let csvContent = 'data:text/csv;charset=utf-8,Category,Value\n';

    labels.forEach((label, index) => {
        const safeLabel = String(label ?? '').replace(/"/g, '""');
        const value = values[index] ?? '';
        csvContent += `"${safeLabel}",${value}\n`;
    });

    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = encodeURI(csvContent);
    link.download = `statistics_data_${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// One download handler per button (the per-tab files no longer attach their own).
(function wireStatisticsDownloads() {
    const csvButton = document.getElementById('downloadButton');
    if (csvButton) {
        csvButton.addEventListener('click', function (event) {
            event.preventDefault();
            downloadStatisticsCsv();
        });
    }
    const chartButton = document.getElementById('downloadChartButton');
    if (chartButton) {
        chartButton.addEventListener('click', function (event) {
            event.preventDefault();
            downloadStatisticsChart();
        });
    }
})();
