document.addEventListener('DOMContentLoaded', () => {
    const ResidentsApp = {
        data: null,
        elements: {
            loadingSpinner: document.getElementById('loading-spinner'),
            mainContent: document.getElementById('main-content'),
            rotationTypeChart: document.getElementById('rotation-type-chart'),
            hospitalDistributionChart: document.getElementById('hospital-distribution-chart'),
            monthlyDistributionChart: document.getElementById('monthly-distribution-chart'),
            durationDistributionChart: document.getElementById('duration-distribution-chart'),
            datatable: document.getElementById('residents-table'),
            summaryStats: document.getElementById('summary-stats'),
            filterYear: document.getElementById('filter-year'),
            filterType: document.getElementById('filter-type'),
            filterHospital: document.getElementById('filter-hospital')
        },
        charts: {},
        filteredData: [],
        
        init() {
            this.showLoading(true);
            this.loadData()
                .then(() => {
                    this.setupFilters();
                    this.setupEventListeners();
                    this.applyFilters();
                    this.showLoading(false);
                })
                .catch(error => {
                    console.error('Error initializing app:', error);
                    this.showLoading(false);
                    this.showError('Failed to load data. Please try again later.');
                });
        },
        
        async loadData() {
            try {
                const response = await fetch('./repository/residents_data.json');
                if (!response.ok) throw new Error('Failed to load residents data');
                this.data = await response.json();
                this.processData();
            } catch (error) {
                console.error('Error loading data:', error);
                throw error;
            }
        },
        
        processData() {
            // Process dates and add calculated fields
            this.data.residents.forEach(resident => {
                resident.startDate = new Date(this.parseDate(resident.startDate));
                resident.endDate = new Date(this.parseDate(resident.endDate));
                
                // Calculate duration in days
                const timeDiff = resident.endDate - resident.startDate;
                resident.durationDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                resident.durationMonths = Math.round(resident.durationDays / 30);
                
                // Extract year, month for filtering and analysis
                resident.startYear = resident.startDate.getFullYear();
                resident.startMonth = resident.startDate.getMonth();
                resident.endYear = resident.endDate.getFullYear();
                resident.endMonth = resident.endDate.getMonth();
            });
        },
        
        parseDate(dateStr) {
            // Parse date format like "9-Jun-24"
            const parts = dateStr.split('-');
            const day = parseInt(parts[0], 10);
            const month = this.getMonthNumber(parts[1]);
            const year = 2000 + parseInt(parts[2], 10); // Assuming all years are in the 2000s
            return `${year}-${month + 1}-${day}`;
        },
        
        getMonthNumber(monthStr) {
            const months = {
                'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
            };
            return months[monthStr];
        },
        
        getMonthName(monthNum) {
            const months = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
            return months[monthNum];
        },
        
        setupFilters() {
            // Populate year filter
            const years = [...new Set(this.data.residents.map(r => r.startYear))].sort();
            this.elements.filterYear.innerHTML = '<option value="all">All Years</option>';
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                this.elements.filterYear.appendChild(option);
            });
            
            // Populate type filter
            const types = [...new Set(this.data.residents.map(r => r.notes))].sort();
            this.elements.filterType.innerHTML = '<option value="all">All Types</option>';
            types.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                this.elements.filterType.appendChild(option);
            });
            
            // Populate hospital filter
            const hospitals = [...new Set(this.data.residents.map(r => r.from))].sort();
            this.elements.filterHospital.innerHTML = '<option value="all">All Hospitals</option>';
            hospitals.forEach(hospital => {
                const option = document.createElement('option');
                option.value = hospital;
                option.textContent = hospital;
                this.elements.filterHospital.appendChild(option);
            });
        },
        
        setupEventListeners() {
            this.elements.filterYear.addEventListener('change', () => this.applyFilters());
            this.elements.filterType.addEventListener('change', () => this.applyFilters());
            this.elements.filterHospital.addEventListener('change', () => this.applyFilters());
            
            // Add export button functionality
            document.getElementById('export-csv').addEventListener('click', () => this.exportToCSV());
            document.getElementById('print-report').addEventListener('click', () => window.print());
        },
        
        applyFilters() {
            const selectedYear = this.elements.filterYear.value;
            const selectedType = this.elements.filterType.value;
            const selectedHospital = this.elements.filterHospital.value;
            
            this.filteredData = this.data.residents.filter(resident => {
                return (selectedYear === 'all' || resident.startYear == selectedYear) &&
                       (selectedType === 'all' || resident.notes === selectedType) &&
                       (selectedHospital === 'all' || resident.from === selectedHospital);
            });
            
            this.renderDashboard();
        },
        
        renderDashboard() {
            this.renderCharts();
            this.renderDataTable();
            this.renderSummaryStats();
        },
        
        renderCharts() {
            // 1. Rotation Type Distribution
            this.renderRotationTypeChart();
            
            // 2. Hospital Distribution
            this.renderHospitalDistributionChart();
            
            // 3. Monthly Distribution
            this.renderMonthlyDistributionChart();
            
            // 4. Duration Distribution
            this.renderDurationDistributionChart();
        },
        
        renderRotationTypeChart() {
            // Group residents by rotation type
            const typeCount = {};
            this.filteredData.forEach(resident => {
                if (!typeCount[resident.notes]) {
                    typeCount[resident.notes] = 0;
                }
                typeCount[resident.notes]++;
            });
            
            const data = {
                labels: Object.keys(typeCount),
                datasets: [{
                    label: 'Rotation Types',
                    data: Object.values(typeCount),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            };
            
            // Destroy existing chart if it exists
            if (this.charts.rotationTypeChart) {
                this.charts.rotationTypeChart.destroy();
            }
            
            // Create new chart
            this.charts.rotationTypeChart = new Chart(this.elements.rotationTypeChart, {
                type: 'pie',
                data: data,
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        },
                        title: {
                            display: true,
                            text: 'Rotation Types Distribution'
                        }
                    }
                }
            });
        },
        
        renderHospitalDistributionChart() {
            // Group residents by source hospital
            const hospitalCount = {};
            this.filteredData.forEach(resident => {
                if (!hospitalCount[resident.from]) {
                    hospitalCount[resident.from] = 0;
                }
                hospitalCount[resident.from]++;
            });
            
            const data = {
                labels: Object.keys(hospitalCount),
                datasets: [{
                    label: 'Number of Residents',
                    data: Object.values(hospitalCount),
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            };
            
            // Destroy existing chart if it exists
            if (this.charts.hospitalDistributionChart) {
                this.charts.hospitalDistributionChart.destroy();
            }
            
            // Create new chart
            this.charts.hospitalDistributionChart = new Chart(this.elements.hospitalDistributionChart, {
                type: 'bar',
                data: data,
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Residents'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Source Hospital'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Residents by Source Hospital'
                        }
                    }
                }
            });
        },
        
        renderMonthlyDistributionChart() {
            // Track residents starting in each month
            const monthlyCount = Array(12).fill(0);
            
            this.filteredData.forEach(resident => {
                monthlyCount[resident.startMonth]++;
            });
            
            const months = Array.from({length: 12}, (_, i) => this.getMonthName(i));
            
            const data = {
                labels: months,
                datasets: [{
                    label: 'Start Date Distribution',
                    data: monthlyCount,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    tension: 0.2,
                    fill: true
                }]
            };
            
            // Destroy existing chart if it exists
            if (this.charts.monthlyDistributionChart) {
                this.charts.monthlyDistributionChart.destroy();
            }
            
            // Create new chart
            this.charts.monthlyDistributionChart = new Chart(this.elements.monthlyDistributionChart, {
                type: 'line',
                data: data,
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Residents'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Month'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Monthly Distribution of Start Dates'
                        }
                    }
                }
            });
        },
        
        renderDurationDistributionChart() {
            // Group residents by duration in months
            const durationGroups = {
                '1 Month': 0,
                '2 Months': 0,
                '3 Months': 0,
                '4-6 Months': 0,
                '7-12 Months': 0,
                'Over 12 Months': 0
            };
            
            this.filteredData.forEach(resident => {
                const months = resident.durationMonths;
                
                if (months <= 1) durationGroups['1 Month']++;
                else if (months === 2) durationGroups['2 Months']++;
                else if (months === 3) durationGroups['3 Months']++;
                else if (months >= 4 && months <= 6) durationGroups['4-6 Months']++;
                else if (months >= 7 && months <= 12) durationGroups['7-12 Months']++;
                else durationGroups['Over 12 Months']++;
            });
            
            const data = {
                labels: Object.keys(durationGroups),
                datasets: [{
                    label: 'Number of Residents',
                    data: Object.values(durationGroups),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            };
            
            // Destroy existing chart if it exists
            if (this.charts.durationDistributionChart) {
                this.charts.durationDistributionChart.destroy();
            }
            
            // Create new chart
            this.charts.durationDistributionChart = new Chart(this.elements.durationDistributionChart, {
                type: 'bar',
                data: data,
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Residents'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Duration'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Distribution by Rotation Length'
                        }
                    }
                }
            });
        },
        
        renderDataTable() {
            // Create table with sortable columns
            const tableContent = `
                <table class="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th data-sort="name">Name <i class="bi bi-arrow-down"></i></th>
                            <th data-sort="from">Hospital <i class="bi bi-arrow-down"></i></th>
                            <th data-sort="notes">Type <i class="bi bi-arrow-down"></i></th>
                            <th data-sort="startDate">Start Date <i class="bi bi-arrow-down"></i></th>
                            <th data-sort="endDate">End Date <i class="bi bi-arrow-down"></i></th>
                            <th data-sort="durationDays">Duration <i class="bi bi-arrow-down"></i></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.generateTableRows()}
                    </tbody>
                </table>
            `;
            
            this.elements.datatable.innerHTML = tableContent;
            
            // Add sorting functionality
            const headers = this.elements.datatable.querySelectorAll('th[data-sort]');
            headers.forEach(header => {
                header.addEventListener('click', () => {
                    const sortField = header.getAttribute('data-sort');
                    this.sortTable(sortField);
                    
                    // Update sort indicators
                    headers.forEach(h => h.querySelector('i').className = 'bi bi-arrow-down text-muted');
                    header.querySelector('i').className = 'bi bi-arrow-down-up';
                });
            });
        },
        
        generateTableRows() {
            return this.filteredData.map(resident => {
                const startDate = resident.startDate.toLocaleDateString();
                const endDate = resident.endDate.toLocaleDateString();
                const duration = `${resident.durationDays} days (${resident.durationMonths} months)`;
                
                return `
                    <tr>
                        <td>${resident.name}</td>
                        <td>${resident.from}</td>
                        <td>${resident.notes}</td>
                        <td>${startDate}</td>
                        <td>${endDate}</td>
                        <td>${duration}</td>
                    </tr>
                `;
            }).join('');
        },
        
        sortTable(field) {
            this.filteredData.sort((a, b) => {
                if (a[field] < b[field]) return -1;
                if (a[field] > b[field]) return 1;
                return 0;
            });
            
            this.renderDataTable();
        },
        
        renderSummaryStats() {
            // Compute summary statistics
            const totalResidents = this.filteredData.length;
            
            // Average duration
            const totalDuration = this.filteredData.reduce((total, resident) => total + resident.durationDays, 0);
            const avgDuration = totalResidents > 0 ? Math.round(totalDuration / totalResidents) : 0;
            
            // Most common hospital
            const hospitalCounts = {};
            this.filteredData.forEach(resident => {
                if (!hospitalCounts[resident.from]) {
                    hospitalCounts[resident.from] = 0;
                }
                hospitalCounts[resident.from]++;
            });
            
            let mostCommonHospital = 'None';
            let maxHospitalCount = 0;
            
            for (const [hospital, count] of Object.entries(hospitalCounts)) {
                if (count > maxHospitalCount) {
                    mostCommonHospital = hospital;
                    maxHospitalCount = count;
                }
            }
            
            // Most common rotation type
            const typeCounts = {};
            this.filteredData.forEach(resident => {
                if (!typeCounts[resident.notes]) {
                    typeCounts[resident.notes] = 0;
                }
                typeCounts[resident.notes]++;
            });
            
            let mostCommonType = 'None';
            let maxTypeCount = 0;
            
            for (const [type, count] of Object.entries(typeCounts)) {
                if (count > maxTypeCount) {
                    mostCommonType = type;
                    maxTypeCount = count;
                }
            }
            
            // Busiest month
            const monthCounts = Array(12).fill(0);
            this.filteredData.forEach(resident => {
                monthCounts[resident.startMonth]++;
            });
            
            const busiestMonthIndex = monthCounts.indexOf(Math.max(...monthCounts));
            const busiestMonth = this.getMonthName(busiestMonthIndex);
            
            // Update summary stats
            this.elements.summaryStats.innerHTML = `
                <div class="row">
                    <div class="col-md-3 mb-3">
                        <div class="card border-primary h-100">
                            <div class="card-body text-center">
                                <h5 class="card-title">Total Residents</h5>
                                <p class="card-text display-4">${totalResidents}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="card border-success h-100">
                            <div class="card-body text-center">
                                <h5 class="card-title">Average Duration</h5>
                                <p class="card-text display-4">${avgDuration}</p>
                                <p class="text-muted">days</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="card border-info h-100">
                            <div class="card-body text-center">
                                <h5 class="card-title">Most Common Hospital</h5>
                                <p class="card-text display-5">${mostCommonHospital}</p>
                                <p class="text-muted">${maxHospitalCount} residents</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="card border-warning h-100">
                            <div class="card-body text-center">
                                <h5 class="card-title">Busiest Month</h5>
                                <p class="card-text display-5">${busiestMonth}</p>
                                <p class="text-muted">${monthCounts[busiestMonthIndex]} new starts</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="card-title mb-0">Detailed Summary</h5>
                            </div>
                            <div class="card-body">
                                <p><strong>Total Number of Residents:</strong> ${totalResidents}</p>
                                <p><strong>Average Rotation Duration:</strong> ${avgDuration} days (${Math.round(avgDuration/30)} months)</p>
                                <p><strong>Most Common Rotation Type:</strong> ${mostCommonType} (${maxTypeCount} residents)</p>
                                <p><strong>Most Common Source Hospital:</strong> ${mostCommonHospital} (${maxHospitalCount} residents)</p>
                                <p><strong>Busiest Month for New Starts:</strong> ${busiestMonth} (${monthCounts[busiestMonthIndex]} starts)</p>
                                
                                <div class="alert alert-info mt-3">
                                    <h6>Insights:</h6>
                                    <ul>
                                        <li>The distribution shows ${(typeCounts['Full'] || 0)} full-time rotations and ${(typeCounts['Elective'] || 0)} elective rotations.</li>
                                        <li>${Math.round((totalResidents > 0 ? maxHospitalCount / totalResidents * 100 : 0))}% of the residents come from ${mostCommonHospital}.</li>
                                        <li>The average rotation lasts ${Math.round(avgDuration/30)} months.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },
        
        exportToCSV() {
            if (this.filteredData.length === 0) {
                alert('No data to export');
                return;
            }
            
            const headers = ['Name', 'Hospital', 'Type', 'Start Date', 'End Date', 'Duration (Days)'];
            
            let csvContent = headers.join(',') + '\n';
            
            this.filteredData.forEach(resident => {
                const startDate = resident.startDate.toLocaleDateString();
                const endDate = resident.endDate.toLocaleDateString();
                
                const row = [
                    `"${resident.name}"`,
                    `"${resident.from}"`,
                    `"${resident.notes}"`,
                    `"${startDate}"`,
                    `"${endDate}"`,
                    resident.durationDays
                ];
                
                csvContent += row.join(',') + '\n';
            });
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'residents_data.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
        
        showLoading(isLoading) {
            if (isLoading) {
                this.elements.loadingSpinner.style.display = 'block';
                this.elements.mainContent.style.display = 'none';
            } else {
                this.elements.loadingSpinner.style.display = 'none';
                this.elements.mainContent.style.display = 'block';
            }
        },
        
        showError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger';
            errorDiv.textContent = message;
            
            this.elements.mainContent.innerHTML = '';
            this.elements.mainContent.appendChild(errorDiv);
        }
    };
    
    ResidentsApp.init();
});
