document.addEventListener('DOMContentLoaded', () => {
    const TimelineApp = {
        data: null,
        currentFilter: 'all',
        elements: {
            datePicker: document.getElementById('date-picker'),
            filterDropdown: document.getElementById('filter-dropdown'),
            refreshBtn: document.getElementById('refresh-btn'),
            yAxis: document.getElementById('y-axis'),
            xAxis: document.getElementById('x-axis'),
            rowsContainer: document.getElementById('rows-container'),
            chartArea: document.getElementById('chart-area'),
            timeIndicator: document.getElementById('time-indicator'),
            timeLabel: document.getElementById('time-label'),
            doctorCount: document.getElementById('doctor-count'),
            tooltip: document.getElementById('tooltip'),
            loadingSpinner: document.getElementById('loading-spinner'),
            timeline: document.getElementById('timeline')
        },
        init() {
            this.showLoading(true);
            this.loadData()
                .then(() => {
                    this.setupEventListeners();
                    this.showLoading(false);
                })
                .catch(error => {
                    console.error('Error initializing app:', error);
                    this.showLoading(false);
                });
        },
        async loadData() {
            try {
                const response = await fetch('/repository/data.json');
                if (!response.ok) throw new Error('Failed to load schedule data');
                this.data = await response.json();
                this.populateDatePicker();
                this.renderTimeline(this.data.schedule[0]);
            } catch (error) {
                console.error('Error loading data:', error);
                throw error;
            }
        },
        populateDatePicker() {
            this.elements.datePicker.innerHTML = ''; // Clear existing options
            this.data.schedule.forEach(day => {
                const option = document.createElement('option');
                option.value = day.date;
                option.textContent = new Date(day.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                this.elements.datePicker.appendChild(option);
            });
        },
        setupEventListeners() {
            // Date picker event
            this.elements.datePicker.addEventListener('change', () => {
                const selectedDate = this.elements.datePicker.value;
                const dayData = this.data.schedule.find(day => day.date === selectedDate);
                if (dayData) this.renderTimeline(dayData);
            });

            // Filter dropdown event
            this.elements.filterDropdown.addEventListener('change', () => {
                this.currentFilter = this.elements.filterDropdown.value;

                const selectedDate = this.elements.datePicker.value;
                const dayData = this.data.schedule.find(day => day.date === selectedDate);
                if (dayData) this.renderTimeline(dayData);

                // Update the doctor statistics based on the new filter
                this.renderDoctorStats();
            });

            // Refresh button event
            this.elements.refreshBtn.addEventListener('click', () => {
                this.showLoading(true);
                this.loadData()
                    .then(() => {
                        const selectedDate = this.elements.datePicker.value;
                        const dayData = this.data.schedule.find(day => day.date === selectedDate);
                        if (dayData) this.renderTimeline(dayData);
                        this.showLoading(false);
                    })
                    .catch(error => {
                        console.error('Error refreshing data:', error);
                        this.showLoading(false);
                    });
            });

            // Time indicator
            this.elements.chartArea.addEventListener('mousemove', e => {
                const rect = this.elements.chartArea.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const position = x / this.elements.chartArea.offsetWidth;

                // Calculate time
                const hour = Math.floor(position * 24);
                const minute = Math.floor((position * 24 - hour) * 60);

                const formattedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

                // Update time indicator position
                this.elements.timeIndicator.style.left = `${x}px`;
                this.elements.timeIndicator.style.display = 'block';
                this.elements.timeLabel.textContent = formattedTime;

                // Show doctor count at current time
                this.updateDoctorCount(hour, minute);
            });

            this.elements.chartArea.addEventListener('mouseleave', () => {
                this.elements.timeIndicator.style.display = 'none';
                this.elements.doctorCount.style.display = 'none';
            });

            // Tooltip for shifts
            this.elements.rowsContainer.addEventListener('mouseover', e => {
                const target = e.target.closest('.shift-block');
                if (target) {
                    const shiftData = JSON.parse(target.dataset.shift);
                    this.showTooltip(shiftData, e);
                }
            });

            this.elements.rowsContainer.addEventListener('mousemove', e => {
                const target = e.target.closest('.shift-block');
                if (target) {
                    this.elements.tooltip.style.left = `${e.pageX + 10}px`;
                    this.elements.tooltip.style.top = `${e.pageY + 10}px`;
                }
            });

            this.elements.rowsContainer.addEventListener('mouseout', e => {
                if (e.target.closest('.shift-block')) {
                    this.elements.tooltip.style.display = 'none';
                }
            });
        },
        showLoading(isLoading) {
            if (isLoading) {
                this.elements.loadingSpinner.style.display = 'block';
                this.elements.timeline.style.display = 'none';
            } else {
                this.elements.loadingSpinner.style.display = 'none';
                this.elements.timeline.style.display = 'grid';
            }
        },
        renderTimeline(dayData) {
            this.updateStatistics(dayData);

            // Clear previous content
            this.elements.yAxis.innerHTML = '';
            this.elements.xAxis.innerHTML = '';
            this.elements.rowsContainer.innerHTML = '';

            // Render axes and shifts
            this.renderYAxis(dayData);
            this.renderXAxis();
            this.renderShifts(dayData);

            // Add Top Doctors by Duties statistics
            this.renderDoctorStats();

            // Add Top Doctors by Weekend Duties statistics
            this.renderWeekendStats()

            // Add Doctor Availability Analysis (Consecutive Working Days)
            this.renderConsecutiveDaysStats()
        },
        renderYAxis(dayData) {
            // Collect all unique row types based on the filter
            const allRows = [];

            if (this.currentFilter === 'all' || this.currentFilter === 'firstOnCall') {
                if (dayData.firstOnCall) {
                    dayData.firstOnCall.forEach(shift => {
                        if (!allRows.includes(shift.shiftType)) {
                            allRows.push(shift.shiftType);
                        }
                    });
                }
            }

            if (this.currentFilter === 'all' || this.currentFilter === 'secondOnCall') {
                if (dayData.secondOnCall) {
                    dayData.secondOnCall.forEach(shift => {
                        const label = shift.area ? `${shift.shiftType} - ${shift.area}` : shift.shiftType;
                        if (!allRows.includes(label)) {
                            allRows.push(label);
                        }
                    });
                }
            }

            if (this.currentFilter === 'all' || this.currentFilter === 'thirdOnCall') {
                if (dayData.thirdOnCall) {
                    dayData.thirdOnCall.forEach(shift => {
                        if (!allRows.includes(shift.shiftType)) {
                            allRows.push(shift.shiftType);
                        }
                    });
                }
            }

            // Create y-axis labels
            allRows.forEach(rowType => {
                const label = document.createElement('div');
                label.className = 'y-label';
                label.textContent = rowType;
                this.elements.yAxis.appendChild(label);

                // Also create the corresponding row
                const row = document.createElement('div');
                row.className = 'row';
                row.dataset.rowType = rowType;
                this.elements.rowsContainer.appendChild(row);
            });
        },
        renderXAxis() {
            // Render only 8 columns (every 3 hours) instead of 24
            for (let i = 0; i < 8; i++) {
                const label = document.createElement('div');
                label.className = 'x-label';
                label.textContent = `${(i * 3).toString().padStart(2, '0')}:00`;
                this.elements.xAxis.appendChild(label);
            }
        },
        renderShifts(dayData) {
            // Process and render shift blocks
            if (this.currentFilter === 'all' || this.currentFilter === 'firstOnCall') {
                this.renderShiftCategory(dayData.firstOnCall, 'firstOnCall');
            }

            if (this.currentFilter === 'all' || this.currentFilter === 'secondOnCall') {
                this.renderShiftCategory(dayData.secondOnCall, 'secondOnCall');
            }

            if (this.currentFilter === 'all' || this.currentFilter === 'thirdOnCall') {
                this.renderShiftCategory(dayData.thirdOnCall, 'thirdOnCall');
            }
        },
        renderShiftCategory(shifts, category) {
            if (!shifts) return;

            shifts.forEach(shift => {
                const rowType = shift.area ? `${shift.shiftType} - ${shift.area}` : shift.shiftType;
                const row = this.elements.rowsContainer.querySelector(`[data-row-type="${rowType}"]`);

                if (!row) return;

                // Parse time range
                const timeRange = this.parseTimeRange(shift.time);
                if (!timeRange) return;

                // Handle overnight shifts that cross midnight
                if (timeRange.overnight) {
                    // First part - from start time to midnight
                    const firstBlockWidth = (24 - timeRange.start.hour - timeRange.start.minute / 60) / 24;

                    const firstBlock = document.createElement('div');
                    firstBlock.className = `shift-block shift-${category}`;
                    firstBlock.style.left = `${this.timeToPercent(timeRange.start) * 100}%`;
                    firstBlock.style.width = `${firstBlockWidth * 100}%`;

                    // Second part - from midnight to end time
                    const secondBlockWidth = (timeRange.end.hour + timeRange.end.minute / 60) / 24;

                    const secondBlock = document.createElement('div');
                    secondBlock.className = `shift-block shift-${category}`;
                    secondBlock.style.left = '0%';
                    secondBlock.style.width = `${secondBlockWidth * 100}%`;

                    // Add doctor names to the first block if it's wider
                    if (shift.doctors && shift.doctors.length > 0) {
                        if (firstBlockWidth > secondBlockWidth && firstBlockWidth > 0.1) {
                            firstBlock.textContent = shift.doctors.join(', ');
                            secondBlock.textContent = '...';
                        } else if (secondBlockWidth > 0.1) {
                            secondBlock.textContent = shift.doctors.join(', ');
                            firstBlock.textContent = '...';
                        } else {
                            firstBlock.textContent = '...';
                            secondBlock.textContent = '...';
                        }
                    }

                    // Store shift data for tooltip
                    const shiftData = JSON.stringify({
                        category,
                        shiftType: shift.shiftType,
                        time: shift.time,
                        doctors: shift.doctors || [],
                        area: shift.area
                    });

                    firstBlock.dataset.shift = shiftData;
                    secondBlock.dataset.shift = shiftData;

                    row.appendChild(firstBlock);
                    row.appendChild(secondBlock);
                } else {
                    // Regular shift (not overnight)
                    const startPercent = this.timeToPercent(timeRange.start);
                    const endPercent = this.timeToPercent(timeRange.end);
                    const width = endPercent - startPercent;

                    const shiftBlock = document.createElement('div');
                    shiftBlock.className = `shift-block shift-${category}`;
                    shiftBlock.style.left = `${startPercent * 100}%`;
                    shiftBlock.style.width = `${width * 100}%`;

                    // Add doctor names if they fit
                    if (shift.doctors && shift.doctors.length > 0) {
                        if (width > 0.1) { // Only show names if block is wide enough
                            shiftBlock.textContent = shift.doctors.join(', ');
                        } else {
                            shiftBlock.textContent = '...';
                        }
                    }

                    // Store shift data for tooltip
                    shiftBlock.dataset.shift = JSON.stringify({
                        category,
                        shiftType: shift.shiftType,
                        time: shift.time,
                        doctors: shift.doctors || [],
                        area: shift.area
                    });

                    row.appendChild(shiftBlock);
                }
            });
        },
        parseTimeRange(timeString) {
            if (timeString === 'All Day') {
                return { start: { hour: 0, minute: 0 }, end: { hour: 24, minute: 0 }, overnight: false };
            }

            const parts = timeString.match(/(\d+)(am|pm)\s+to\s+(\d+)(am|pm)/i);
            if (!parts) return null;

            const startHour = parseInt(parts[1]);
            const startAmPm = parts[2].toLowerCase();
            const endHour = parseInt(parts[3]);
            const endAmPm = parts[4].toLowerCase();

            // Convert to 24-hour format
            const start = {
                hour: startAmPm === 'pm' && startHour !== 12 ? startHour + 12 : (startAmPm === 'am' && startHour === 12 ? 0 : startHour),
                minute: 0
            };

            const end = {
                hour: endAmPm === 'pm' && endHour !== 12 ? endHour + 12 : (endAmPm === 'am' && endHour === 12 ? 0 : endHour),
                minute: 0
            };

            // Check if this is an overnight shift
            const overnight = end.hour < start.hour;

            return { start, end, overnight };
        },
        timeToPercent(time) {
            // Convert time to percentage based on 8 columns instead of 24
            return (time.hour + time.minute / 60) / 24;
        },
        updateDoctorCount(hour, minute) {
            const selectedDate = this.elements.datePicker.value;
            const dayData = this.data.schedule.find(day => day.date === selectedDate);
            if (!dayData) return;

            const currentTime = { hour, minute };
            const activeDoctors = [];

            // Find all doctors active at the current time
            const checkShifts = (shifts, category) => {
                if (!shifts) return;

                if (this.currentFilter === 'all' || this.currentFilter === category) {
                    shifts.forEach(shift => {
                        const timeRange = this.parseTimeRange(shift.time);
                        if (!timeRange) return;

                        let isActive = false;
                        const currentTimeInMinutes = currentTime.hour * 60 + currentTime.minute;

                        if (timeRange.overnight) {
                            // For overnight shifts, check if time is after start or before end
                            const startTimeInMinutes = timeRange.start.hour * 60 + timeRange.start.minute;
                            const endTimeInMinutes = timeRange.end.hour * 60 + timeRange.end.minute;

                            isActive = currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes < endTimeInMinutes;
                        } else {
                            // For regular shifts
                            const startTimeInMinutes = timeRange.start.hour * 60 + timeRange.start.minute;
                            const endTimeInMinutes = timeRange.end.hour * 60 + timeRange.end.minute;

                            isActive = currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
                        }

                        if (isActive && shift.doctors && shift.doctors.length > 0) {
                            shift.doctors.forEach(doctor => {
                                if (!activeDoctors.includes(doctor)) {
                                    activeDoctors.push(doctor);
                                }
                            });
                        }
                    });
                }
            };

            checkShifts(dayData.firstOnCall, 'firstOnCall');
            checkShifts(dayData.secondOnCall, 'secondOnCall');
            checkShifts(dayData.thirdOnCall, 'thirdOnCall');

            // Update doctor count display
            if (activeDoctors.length > 0) {
                this.elements.doctorCount.innerHTML = `
                    <strong>${activeDoctors.length} doctors on duty:</strong><br>
                    ${activeDoctors.join(', ')}
                `;
                this.elements.doctorCount.style.display = 'block';
            } else {
                this.elements.doctorCount.style.display = 'none';
            }
        },
        showTooltip(shiftData, event) {
            const { category, shiftType, time, doctors, area } = shiftData;

            let categoryText = '';
            if (category === 'firstOnCall') categoryText = 'First On Call';
            else if (category === 'secondOnCall') categoryText = 'Second On Call';
            else if (category === 'thirdOnCall') categoryText = 'Third On Call';

            let content = `
                <strong>${shiftType}</strong><br>
                <strong>Category:</strong> ${categoryText}<br>
                <strong>Time:</strong> ${time}<br>
            `;

            if (area) {
                content += `<strong>Area:</strong> ${area}<br>`;
            }

            if (doctors && doctors.length > 0) {
                content += `<strong>Doctors:</strong> ${doctors.join(', ')}`;
            } else {
                content += '<strong>Doctors:</strong> None assigned';
            }

            this.elements.tooltip.innerHTML = content;
            this.elements.tooltip.style.left = `${event.pageX + 10}px`;
            this.elements.tooltip.style.top = `${event.pageY + 10}px`;
            this.elements.tooltip.style.display = 'block';
        },
        updateStatistics(dayData) {
            const totalShifts = (dayData.firstOnCall?.length || 0) +
                (dayData.secondOnCall?.length || 0) +
                (dayData.thirdOnCall?.length || 0);

            const allDoctors = new Set();
            ['firstOnCall', 'secondOnCall', 'thirdOnCall'].forEach(category => {
                dayData[category]?.forEach(shift => {
                    shift.doctors?.forEach(doctor => allDoctors.add(doctor));
                });
            });

            const totalDoctors = allDoctors.size;

            // Update the statistics in the UI
            document.getElementById('total-shifts').textContent = totalShifts;
            document.getElementById('total-doctors').textContent = totalDoctors;
            document.getElementById('selected-date').textContent = new Date(dayData.date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
        },
        computeDoctorStats() {
            const stats = {
                all: {},
                firstOnCall: {},
                secondOnCall: {},
                thirdOnCall: {}
            };

            // Track shift types for each doctor
            const shiftTypes = {
                all: {},
                firstOnCall: {},
                secondOnCall: {},
                thirdOnCall: {}
            };

            // Process all days in the schedule
            this.data.schedule.forEach(day => {
                ['firstOnCall', 'secondOnCall', 'thirdOnCall'].forEach(category => {
                    if (!day[category]) return;

                    day[category].forEach(shift => {
                        if (!shift.doctors || shift.doctors.length === 0) return;

                        shift.doctors.forEach(doctor => {
                            // Count in the specific category
                            if (!stats[category][doctor]) {
                                stats[category][doctor] = 0;
                                shiftTypes[category][doctor] = {};
                            }
                            stats[category][doctor]++;

                            // Track shift type
                            if (!shiftTypes[category][doctor][shift.shiftType]) {
                                shiftTypes[category][doctor][shift.shiftType] = 0;
                            }
                            shiftTypes[category][doctor][shift.shiftType]++;

                            // Count in the "all" category
                            if (!stats.all[doctor]) {
                                stats.all[doctor] = 0;
                                shiftTypes.all[doctor] = {};
                            }
                            stats.all[doctor]++;

                            // Track shift type in "all" category
                            if (!shiftTypes.all[doctor][shift.shiftType]) {
                                shiftTypes.all[doctor][shift.shiftType] = 0;
                            }
                            shiftTypes.all[doctor][shift.shiftType]++;
                        });
                    });
                });
            });

            return { stats, shiftTypes };
        },
        renderDoctorStats() {
            const { stats, shiftTypes } = this.computeDoctorStats();
            const currentStats = stats[this.currentFilter === 'all' ? 'all' : this.currentFilter];
            const currentShiftTypes = shiftTypes[this.currentFilter === 'all' ? 'all' : this.currentFilter];

            // Convert to array for sorting
            const doctorsArray = Object.entries(currentStats)
                .map(([name, count]) => ({
                    name,
                    count,
                    // Find most common shift type
                    topShift: Object.entries(currentShiftTypes[name] || {})
                        .sort((a, b) => b[1] - a[1])
                        .map(([type, count]) => `${type} (${count})`)
                        .slice(0, 2)
                        .join(', ')
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10); // Top 10 doctors

            const statsContainer = document.getElementById('doctor-stats');
            statsContainer.innerHTML = '';

            const title = document.createElement('h3');
            title.textContent = `Top Doctors by Duties (${this.currentFilter === 'all' ? 'All Categories' : this.currentFilter})`;
            title.className = 'card-title';
            statsContainer.appendChild(title);

            if (doctorsArray.length === 0) {
                const noData = document.createElement('p');
                noData.textContent = 'No data available for the selected filter.';
                statsContainer.appendChild(noData);
                return;
            }

            const table = document.createElement('table');
            table.className = 'table table-striped table-hover stats-table';

            // Create header row
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            ['Rank', 'Doctor', 'Total Duties', 'Most Common Shifts'].forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Create data rows
            const tbody = document.createElement('tbody');
            doctorsArray.forEach((doctor, index) => {
                const row = document.createElement('tr');

                const rankCell = document.createElement('td');
                rankCell.textContent = index + 1;
                row.appendChild(rankCell);

                const nameCell = document.createElement('td');
                nameCell.textContent = doctor.name;
                row.appendChild(nameCell);

                const countCell = document.createElement('td');
                countCell.textContent = doctor.count;
                row.appendChild(countCell);

                const shiftCell = document.createElement('td');
                shiftCell.textContent = doctor.topShift || 'N/A';
                row.appendChild(shiftCell);

                tbody.appendChild(row);
            });
            table.appendChild(tbody);

            statsContainer.appendChild(table);
        },
        computeWeekendStats() {
            const weekendStats = {};

            // Process all days in the schedule
            this.data.schedule.forEach(day => {
                const date = new Date(day.date);
                const dayOfWeek = date.getDay(); // 5 = Friday, 6 = Saturday

                if (dayOfWeek === 5 || dayOfWeek === 6) {
                    ['firstOnCall', 'secondOnCall', 'thirdOnCall'].forEach(category => {
                        if (!day[category]) return;

                        day[category].forEach(shift => {
                            if (!shift.doctors || shift.doctors.length === 0) return;

                            shift.doctors.forEach(doctor => {
                                if (!weekendStats[doctor]) {
                                    weekendStats[doctor] = {
                                        total: 0,
                                        fridays: 0,
                                        saturdays: 0,
                                        shifts: {}
                                    };
                                }

                                weekendStats[doctor].total++;

                                if (dayOfWeek === 5) {
                                    weekendStats[doctor].fridays++;
                                } else {
                                    weekendStats[doctor].saturdays++;
                                }

                                // Track shift types
                                if (!weekendStats[doctor].shifts[shift.shiftType]) {
                                    weekendStats[doctor].shifts[shift.shiftType] = 0;
                                }
                                weekendStats[doctor].shifts[shift.shiftType]++;
                            });
                        });
                    });
                }
            });

            return weekendStats;
        },
        renderWeekendStats() {
            const weekendStats = this.computeWeekendStats();

            // Convert to array for sorting
            const doctorsArray = Object.entries(weekendStats)
                .map(([name, data]) => ({
                    name,
                    total: data.total,
                    fridays: data.fridays,
                    saturdays: data.saturdays,
                    commonShift: Object.entries(data.shifts)
                        .sort((a, b) => b[1] - a[1])
                        .map(([type, count]) => `${type} (${count})`)
                        .slice(0, 1)
                        .join(', ')
                }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 10); // Top 10 doctors

            const statsContainer = document.getElementById('weekend-stats');
            statsContainer.innerHTML = '';

            const title = document.createElement('h3');
            title.textContent = 'Top Doctors by Weekend Duties (Friday & Saturday)';
            title.className = 'card-title';
            statsContainer.appendChild(title);

            if (doctorsArray.length === 0) {
                const noData = document.createElement('p');
                noData.textContent = 'No data available for weekend duties.';
                statsContainer.appendChild(noData);
                return;
            }

            const table = document.createElement('table');
            table.className = 'table table-striped table-hover stats-table';

            // Create header row
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            ['Rank', 'Doctor', 'Total Weekend Duties', 'Fridays', 'Saturdays', 'Most Common Shift'].forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Create data rows
            const tbody = document.createElement('tbody');
            doctorsArray.forEach((doctor, index) => {
                const row = document.createElement('tr');

                const rankCell = document.createElement('td');
                rankCell.textContent = index + 1;
                row.appendChild(rankCell);

                const nameCell = document.createElement('td');
                nameCell.textContent = doctor.name;
                row.appendChild(nameCell);

                const totalCell = document.createElement('td');
                totalCell.textContent = doctor.total;
                row.appendChild(totalCell);

                const fridaysCell = document.createElement('td');
                fridaysCell.textContent = doctor.fridays;
                row.appendChild(fridaysCell);

                const saturdaysCell = document.createElement('td');
                saturdaysCell.textContent = doctor.saturdays;
                row.appendChild(saturdaysCell);

                const shiftCell = document.createElement('td');
                shiftCell.textContent = doctor.commonShift || 'N/A';
                row.appendChild(shiftCell);

                tbody.appendChild(row);
            });
            table.appendChild(tbody);

            statsContainer.appendChild(table);
        },
        computeConsecutiveDaysStats() {
            const consecutiveStats = {};
            const doctorSchedule = {};

            // First, create a calendar for each doctor
            this.data.schedule.forEach(day => {
                const dateStr = day.date;

                ['firstOnCall', 'secondOnCall', 'thirdOnCall'].forEach(category => {
                    if (!day[category]) return;

                    day[category].forEach(shift => {
                        if (!shift.doctors || shift.doctors.length === 0) return;

                        shift.doctors.forEach(doctor => {
                            if (!doctorSchedule[doctor]) {
                                doctorSchedule[doctor] = {};
                            }
                            doctorSchedule[doctor][dateStr] = true;
                        });
                    });
                });
            });

            // Then analyze consecutive days
            Object.entries(doctorSchedule).forEach(([doctor, dates]) => {
                const workDays = Object.keys(dates).sort();
                let consecutiveCount = 0;
                let maxConsecutive = 0;
                let currentStreak = 1;

                for (let i = 1; i < workDays.length; i++) {
                    const prevDate = new Date(workDays[i - 1]);
                    const currDate = new Date(workDays[i]);

                    // Check if dates are consecutive
                    const diffTime = Math.abs(currDate - prevDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) {
                        currentStreak++;
                    } else {
                        // Record the consecutive streak if it's more than 1 day
                        if (currentStreak > 1) {
                            consecutiveCount++;
                        }

                        maxConsecutive = Math.max(maxConsecutive, currentStreak);
                        currentStreak = 1;
                    }
                }

                // Check final streak
                // Check final streak
                if (currentStreak > 1) {
                    consecutiveCount++;
                }
                maxConsecutive = Math.max(maxConsecutive, currentStreak);

                if (maxConsecutive > 1) {
                    consecutiveStats[doctor] = {
                        totalStreaks: consecutiveCount,
                        maxConsecutive: maxConsecutive,
                        totalDays: workDays.length
                    };
                }
            });

            return consecutiveStats;
        },
        renderConsecutiveDaysStats() {
            const consecutiveStats = this.computeConsecutiveDaysStats();

            // Convert to array for sorting
            const doctorsArray = Object.entries(consecutiveStats)
                .map(([name, data]) => ({
                    name,
                    streaks: data.totalStreaks,
                    maxConsecutive: data.maxConsecutive,
                    totalDays: data.totalDays
                }))
                .sort((a, b) => b.maxConsecutive - a.maxConsecutive)
                .slice(0, 10); // Top 10 doctors

            const statsContainer = document.getElementById('consecutive-days-stats');
            statsContainer.innerHTML = '';

            const title = document.createElement('h3');
            title.textContent = 'Doctor Availability Analysis (Consecutive Working Days)';
            title.className = 'card-title';
            statsContainer.appendChild(title);

            if (doctorsArray.length === 0) {
                const noData = document.createElement('p');
                noData.textContent = 'No consecutive days data available.';
                statsContainer.appendChild(noData);
                return;
            }

            const table = document.createElement('table');
            table.className = 'table table-striped table-hover stats-table';

            // Create header row
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            ['Rank', 'Doctor', 'Longest Streak', 'Number of Streaks', 'Total Days Worked'].forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Create data rows
            const tbody = document.createElement('tbody');
            doctorsArray.forEach((doctor, index) => {
                const row = document.createElement('tr');

                const rankCell = document.createElement('td');
                rankCell.textContent = index + 1;
                row.appendChild(rankCell);

                const nameCell = document.createElement('td');
                nameCell.textContent = doctor.name;
                row.appendChild(nameCell);

                const maxConsecutiveCell = document.createElement('td');
                maxConsecutiveCell.textContent = doctor.maxConsecutive + ' days';
                row.appendChild(maxConsecutiveCell);

                const streaksCell = document.createElement('td');
                streaksCell.textContent = doctor.streaks;
                row.appendChild(streaksCell);

                const totalDaysCell = document.createElement('td');
                totalDaysCell.textContent = doctor.totalDays;
                row.appendChild(totalDaysCell);

                tbody.appendChild(row);
            });
            table.appendChild(tbody);

            statsContainer.appendChild(table);
        }
    };

    TimelineApp.init();
});