$(document).ready(function() {
    let cpedData;
    let chinaMap;
    let politicalMobilityData;

    // Load geographic data and city coordinates
    console.log('Starting to load geographic data...');
    
    // Try to load map data with better error handling
    const loadMapData = async () => {
        try {
            // Try loading China map data from online sources
            const onlineMapSources = [
                'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json'
            ];
            
            let mapLoaded = false;
            for (const source of onlineMapSources) {
                try {
                    console.log(`🗺️ Trying to load map from: ${source}`);
                    const mapResponse = await fetch(source);
                    if (mapResponse.ok) {
                        const mapData = await mapResponse.json();
                        if (mapData.features && mapData.features.length > 0) {
                            chinaMap = mapData;
                            console.log('✅ China map data loaded successfully from:', source);
                            console.log('📊 Map contains', mapData.features.length, 'geographic features');
                            
                            // 检查是否是中国地图数据
                            const sampleFeature = mapData.features[0];
                            const featureName = sampleFeature.properties?.name || sampleFeature.properties?.NAME || '';
                            console.log('📝 Sample feature name:', featureName);
                            
                            mapLoaded = true;
                            break;
                        }
                    }
                } catch (mapError) {
                    console.warn(`❌ Failed to load from ${source}:`, mapError);
                }
            }
            
            if (!mapLoaded) {
                console.warn('⚠️ All map sources failed - no China map available');
                chinaMap = null;
            }
            
                        // Load city coordinates from the specified CSV source only
            let citiesLoaded = false;
            let cityCoordinatesDict = {}; // Dictionary for fast lookups
            
            // Only use the specified CSV data source
            const csvSource = 'https://raw.githubusercontent.com/Jayl1n/china_coordinates/master/china_coordinates.csv';
            
            try {
                console.log(`🌆 Loading city data from: ${csvSource}`);
                const citiesResponse = await fetch(csvSource);
                
                if (citiesResponse.ok) {
                    const csvText = await citiesResponse.text();
                    console.log(`📦 Loaded CSV data from ${csvSource}, processing...`);
                    
                    const lines = csvText.split('\n');
                    if (lines.length < 1) {
                        throw new Error('CSV file appears to be empty');
                    }
                    
                    console.log(`📋 CSV format: 行政区代码,城市名,经度,纬度 (无列名)`);
                    console.log(`📊 Total lines to process: ${lines.length}`);
                    
                    // Process each line of the CSV (no header line)
                    let processedLines = 0;
                    let validEntries = 0;
                    
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (line && line.length > 10) { // Skip very short lines
                            processedLines++;
                            // Parse CSV: 行政区代码,城市名,经度,纬度
                            const values = line.split(',').map(v => v.trim());
                            
                            if (values.length >= 4) {
                                const adminCode = values[0];      // 行政区代码
                                const cityName = values[1];      // 城市名
                                const longitude = parseFloat(values[2]); // 经度
                                const latitude = parseFloat(values[3]);  // 纬度
                                
                                if (cityName && !isNaN(longitude) && !isNaN(latitude)) {
                                    validEntries++;
                                    // Store in dictionary with multiple key formats for better matching
                                    const cityData = {
                                        Name: cityName,
                                        Longitude: longitude,
                                        Latitude: latitude,
                                        AdminCode: adminCode
                                    };
                                    
                                    // Add exact name
                                    cityCoordinatesDict[cityName] = cityData;
                                    
                                    // Add name without suffix (市/县/区等)
                                    const cleanName = cityName.replace(/[市县区省自治区特别行政区]/g, '');
                                    if (cleanName !== cityName && cleanName.length >= 2) {
                                        cityCoordinatesDict[cleanName] = cityData;
                                    }
                                    
                                    // Add common variations
                                    if (cityName.includes('市')) {
                                        const nameWithoutShi = cityName.replace('市', '');
                                        if (nameWithoutShi.length >= 2) {
                                            cityCoordinatesDict[nameWithoutShi] = cityData;
                                        }
                                    }
                                    
                                    // Add variations for 区
                                    if (cityName.includes('区')) {
                                        const nameWithoutQu = cityName.replace('区', '');
                                        if (nameWithoutQu.length >= 2) {
                                            cityCoordinatesDict[nameWithoutQu] = cityData;
                                        }
                                    }
                                    
                                    // Add variations for 县
                                    if (cityName.includes('县')) {
                                        const nameWithoutXian = cityName.replace('县', '');
                                        if (nameWithoutXian.length >= 2) {
                                            cityCoordinatesDict[nameWithoutXian] = cityData;
                                        }
                                    }
                                } else {
                                    console.warn(`⚠️ Invalid data in line ${i + 1}: ${line}`);
                                }
                            } else {
                                console.warn(`⚠️ Insufficient columns in line ${i + 1}: ${line}`);
                            }
                        }
                    }
                    
                    // Processing complete, show statistics
                    console.log(`📊 Processing complete: ${processedLines} lines processed, ${validEntries} valid entries found`);
                    
                    const coordCount = Object.keys(cityCoordinatesDict).length;
                    console.log(`📍 Created ${coordCount} dictionary entries (including variations)`);
                    
                    if (coordCount > 0) {
                        // Convert dictionary to nodes array for compatibility with existing code
                        const uniqueCities = {};
                        Object.values(cityCoordinatesDict).forEach(city => {
                            uniqueCities[city.Name] = city;
                        });
                        
                        politicalMobilityData = { 
                            nodes: Object.values(uniqueCities),
                            dict: cityCoordinatesDict // Keep dictionary for fast lookups
                        };
                        
                        const uniqueCount = Object.keys(uniqueCities).length;
                        console.log(`✅ Successfully loaded ${uniqueCount} unique cities from CSV`);
                        console.log(`🔍 Dictionary contains ${coordCount} searchable entries for better matching`);
                        
                        // Show some sample cities for verification
                        const sampleCities = Object.keys(uniqueCities).slice(0, 10);
                        console.log(`📝 Sample cities: ${sampleCities.join(', ')}`);
                        
                        // Show dictionary structure sample
                        const dictKeys = Object.keys(cityCoordinatesDict).slice(0, 15);
                        console.log(`🗝️ Sample dictionary keys: ${dictKeys.join(', ')}`);
                        
                        citiesLoaded = true;
                    } else {
                        throw new Error('No valid city coordinates found in CSV');
                    }
                } else {
                    throw new Error(`HTTP ${citiesResponse.status} from ${csvSource}`);
                }
            } catch (cityError) {
                console.error(`❌ Failed to load city data from ${csvSource}:`, cityError.message);
                console.warn('🚫 Unable to load city coordinates - geographic visualization may not work properly');
                cityCoordinatesDict = {};
                politicalMobilityData = { nodes: [], dict: {} };
            }
            
            // Final check for city data loading
            if (!citiesLoaded) {
                console.warn('🚫 CSV city data source failed - no city coordinates available');
                politicalMobilityData = { nodes: [], dict: {} };
            }
            
        } catch (error) {
            console.error('Error in loadMapData:', error);
            // Final fallback
            politicalMobilityData = { nodes: [] };
        }
        
        console.log('Geographic data initialization completed');
        console.log('Available cities for mapping:', politicalMobilityData?.nodes?.length || 0);
    };
    

    
    loadMapData();

    // Try to load CPED data from localStorage or load sample data
    cpedData = JSON.parse(localStorage.getItem('cpedData') || '[]');
    
    // If no data is available, load CPED.xlsx
    if (cpedData.length === 0) {
        loadCPEDData();
    }
    
    $('#drawButton').click(function() {
        const officialName = $('#officialName').val().trim();
        const visualType = $('#visualType').val();
        
        console.log('Drawing visualization for:', officialName, 'Type:', visualType);
        console.log('Available data records:', cpedData?.length || 0);
        
        if (!officialName) {
            alert('请输入官员姓名！');
            return;
        }
        
        if (!cpedData || cpedData.length === 0) {
            alert('请先加载CPED数据！');
            return;
        }
        
        // Search for the official in the data
        const officialRecords = searchOfficial(officialName, cpedData);
        console.log('Found records for', officialName, ':', officialRecords.length);
        
        if (officialRecords.length === 0) {
            alert(`未找到官员"${officialName}"的记录！请检查姓名拼写。`);
            return;
        }
        
        // Generate visualization based on type
        if (visualType === 'rank') {
            drawRankingVisualization(officialRecords, officialName);
        } else if (visualType === 'geography') {
            drawGeographyVisualization(officialRecords, officialName);
        }
        
        // Generate official report
        generateOfficialReport(officialRecords, officialName);
    });
    
    // Data preview button
    $('#previewDataButton').click(function() {
        if (!cpedData || cpedData.length === 0) {
            alert('没有数据可以预览！请等待数据加载完成。');
            return;
        }
        
        showDataPreview(cpedData);
    });
    
    // Clear and reload data button
    $('#clearDataButton').click(function() {
        localStorage.removeItem('cpedData');
        cpedData = [];
        $('#visualizationArea').html(`
            <div style="text-align: center; padding: 50px; color: #666;">
                <i class="fa fa-refresh fa-spin" style="font-size: 48px; margin-bottom: 20px;"></i>
                <p style="font-size: 18px; font-family: 'retro1', sans-serif;">正在重新加载数据...</p>
            </div>
        `);
        loadCPEDData();
    });
    
    // Smart field identification function
    function identifyFields(data) {
        if (!data || data.length === 0) return {};
        
        const sampleRecord = data[0];
        const allFields = Object.keys(sampleRecord);
        
        const fieldMapping = {
            name: null,
            position: null,
            location: null,
            date: null,
            rank: null,
            province: null,
            city: null,
            district: null,
            experienceIndex: null,
            startDate: null,
            endDate: null
        };
        
        // Name field patterns
        const namePatterns = ['姓名', 'name', '官员', 'person', '人员', 'Name'];
        fieldMapping.name = allFields.find(field => 
            namePatterns.some(pattern => 
                field.toLowerCase().includes(pattern.toLowerCase()) ||
                field.includes(pattern)
            )
        );
        
        // Position field patterns - prioritize non-encoded fields
        const positionPatterns = ['具体职务', '职务一级关键词', '职务二级关键词', '职位', '职务', 'position', 'post', 'job', 'title', '岗位'];
        fieldMapping.position = allFields.find(field => 
            positionPatterns.some(pattern => 
                field.toLowerCase().includes(pattern.toLowerCase()) ||
                field.includes(pattern)
            ) && !field.includes('编码') // avoid encoded fields
        );
        
        // Location field patterns
        const locationPatterns = ['地点', '地区', 'location', 'place', '地方', '地方一级关键词', '地方二级关键词', '地方三级关键词'];
        fieldMapping.location = allFields.find(field => 
            locationPatterns.some(pattern => 
                field.toLowerCase().includes(pattern.toLowerCase()) ||
                field.includes(pattern)
            )
        );
        
        // Province field patterns - 地方一级关键词就是省级
        const provincePatterns = ['地方一级关键词', '省', 'province', '省份'];
        fieldMapping.province = allFields.find(field => 
            provincePatterns.some(pattern => 
                field === pattern || // 精确匹配优先
                field.toLowerCase().includes(pattern.toLowerCase()) ||
                field.includes(pattern)
            )
        );
        
        // City field patterns - 地方二级关键词就是市级
        const cityPatterns = ['地方二级关键词', '市', 'city', '城市'];
        fieldMapping.city = allFields.find(field => 
            cityPatterns.some(pattern => 
                field === pattern || // 精确匹配优先
                field.toLowerCase().includes(pattern.toLowerCase()) ||
                field.includes(pattern)
            )
        );
        
        // District field patterns - 地方三级关键词就是区县级
        const districtPatterns = ['地方三级关键词', '区', '县', 'district', 'county'];
        fieldMapping.district = allFields.find(field => 
            districtPatterns.some(pattern => 
                field === pattern || // 精确匹配优先
                field.toLowerCase().includes(pattern.toLowerCase()) ||
                field.includes(pattern)
            )
        );
        
        // Date field patterns
        const datePatterns = ['时间', '日期', 'date', 'time', '起始时间', '终止时间', 'start', 'end'];
        fieldMapping.date = allFields.find(field => 
            datePatterns.some(pattern => 
                field.toLowerCase().includes(pattern.toLowerCase()) ||
                field.includes(pattern)
            )
        );
        
        // Start date field patterns
        const startDatePatterns = ['起始时间', 'start', '开始时间', '任职时间'];
        fieldMapping.startDate = allFields.find(field => 
            startDatePatterns.some(pattern => 
                field.toLowerCase().includes(pattern.toLowerCase()) ||
                field.includes(pattern)
            )
        ) || fieldMapping.date;
        
        // End date field patterns
        const endDatePatterns = ['终止时间', 'end', '结束时间', '离职时间'];
        fieldMapping.endDate = allFields.find(field => 
            endDatePatterns.some(pattern => 
                field.toLowerCase().includes(pattern.toLowerCase()) ||
                field.includes(pattern)
            )
        );
        
        // Rank field patterns - prioritize specific rank fields
        const rankPatterns = ['级别', '职级', '等级', 'rank', 'level', '地区级别'];
        fieldMapping.rank = allFields.find(field => 
            rankPatterns.some(pattern => 
                field.toLowerCase().includes(pattern.toLowerCase()) ||
                field.includes(pattern)
            )
        );
        
        // Experience index patterns
        const indexPatterns = ['序号', 'index', '经历序号', '顺序', 'order'];
        fieldMapping.experienceIndex = allFields.find(field => 
            indexPatterns.some(pattern => 
                field.toLowerCase().includes(pattern.toLowerCase()) ||
                field.includes(pattern)
            )
        );
        
        console.log('Field mapping identified:', fieldMapping);
        
        // Show field mapping in a more readable format
        console.log('📋 Field Mapping Summary:');
        console.log(`  姓名: ${fieldMapping.name}`);
        console.log(`  职位: ${fieldMapping.position}`); 
        console.log(`  级别: ${fieldMapping.rank}`);
        console.log(`  地点: ${fieldMapping.location}`);
        console.log(`  起始时间: ${fieldMapping.startDate}`);
        console.log(`  经历序号: ${fieldMapping.experienceIndex}`);
        
        return fieldMapping;
    }
    
    function searchOfficial(name, data) {
        console.log('Searching for:', name, 'in', data.length, 'records');
        
        if (data.length === 0) {
            console.log('No data available for search');
            return [];
        }
        
        // Get field mapping
        const fields = identifyFields(data);
        console.log('Available fields in data:', Object.keys(data[0]));
        console.log('Identified field mapping:', fields);
        
        // Try to find name field
        const nameField = fields.name || Object.keys(data[0])[0]; // fallback to first field
        
        console.log('Using name field:', nameField);
        
        // First try exact match in name field
        let exactMatches = data.filter(record => {
            const fieldValue = record[nameField];
            return fieldValue && fieldValue.toString().trim() === name.trim();
        });
        
        if (exactMatches.length > 0) {
            console.log('Found exact matches:', exactMatches.length);
            console.log('Sample exact match:', exactMatches[0]);
            return exactMatches;
        }
        
        // Then try partial matches in name field
        let partialMatches = data.filter(record => {
            const fieldValue = record[nameField];
            return fieldValue && fieldValue.toString().includes(name);
        });
        
        // If still no matches, try searching in all potential name fields
        if (partialMatches.length === 0) {
            console.log('Trying fuzzy search across all fields...');
            partialMatches = data.filter(record => {
                return Object.keys(record).some(field => {
                    const fieldValue = record[field];
                    return fieldValue && 
                           typeof fieldValue === 'string' &&
                           fieldValue.length >= 2 && 
                           fieldValue.length <= 20 && // reasonable name length
                           fieldValue.includes(name);
                });
            });
        }
        
        console.log('Found partial matches:', partialMatches.length);
        if (partialMatches.length > 0) {
            console.log('Sample partial match:', partialMatches[0]);
        }
        
        return partialMatches;
    }
    
    function drawRankingVisualization(records, officialName) {
        console.log('Drawing ranking visualization for:', officialName);
        
        // Clear previous visualization
        $('#visualizationArea').html('');
        
        // Create ranking change visualization
        const width = 800;
        const height = 400;
        const margin = {top: 20, right: 30, bottom: 40, left: 100};
        
        const svg = d3.select('#visualizationArea')
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        
        // Process ranking data
        const rankingData = processRankingData(records);
        console.log('Processed ranking data:', rankingData);
        
        if (rankingData.length === 0) {
            svg.append('text')
                .attr('x', width/2)
                .attr('y', height/2)
                .attr('text-anchor', 'middle')
                .style('font-size', '16px')
                .text('未找到职级变化数据');
            return;
        }
        
        // Define rank hierarchy (top to bottom)
        const rankHierarchy = [
            '正国级', '副国级',
            '正部级', '副部级', 
            '正厅级', '副厅级',
            '正处级', '副处级',
            '正科级', '副科级',
            '正股级', '副股级',
            '无级别'
        ];
        
        // Map actual ranks to standardized ranks
        function standardizeRank(rank) {
            if (!rank || rank === '未知等级' || rank === '未知') return '无级别';
            
            const rankStr = rank.toString().toLowerCase();
            
            // 国家级
            if (rankStr.includes('正国') || rankStr.includes('国家') || 
                rankStr.includes('主席') || rankStr.includes('总理') || 
                rankStr.includes('委员长')) return '正国级';
            if (rankStr.includes('副国') || rankStr.includes('副总理') || 
                rankStr.includes('副主席')) return '副国级';
            
            // 省部级 
            if (rankStr.includes('正部') || rankStr.includes('部长') || 
                rankStr.includes('省长') || rankStr.includes('省委书记') ||
                rankStr.includes('直辖市')) return '正部级';
            if (rankStr.includes('副部') || rankStr.includes('副部长') || 
                rankStr.includes('副省长') || rankStr.includes('省委副书记')) return '副部级';
            
            // 厅局级
            if (rankStr.includes('正厅') || rankStr.includes('厅长') || 
                rankStr.includes('局长') || rankStr.includes('司长') ||
                rankStr.includes('地级市')) return '正厅级';
            if (rankStr.includes('副厅') || rankStr.includes('副厅长') || 
                rankStr.includes('副局长') || rankStr.includes('副司长')) return '副厅级';
            
            // 县处级
            if (rankStr.includes('正处') || rankStr.includes('处长') || 
                rankStr.includes('县长') || rankStr.includes('县委书记') ||
                rankStr.includes('县级')) return '正处级';
            if (rankStr.includes('副处') || rankStr.includes('副处长') || 
                rankStr.includes('副县长') || rankStr.includes('县委副书记')) return '副处级';
            
            // 科级
            if (rankStr.includes('正科') || rankStr.includes('科长') ||
                rankStr.includes('主任科员') || rankStr.includes('乡级')) return '正科级';
            if (rankStr.includes('副科') || rankStr.includes('副科长') ||
                rankStr.includes('副主任科员')) return '副科级';
            
            // 股级
            if (rankStr.includes('正股') || rankStr.includes('股长')) return '正股级';
            if (rankStr.includes('副股') || rankStr.includes('副股长')) return '副股级';
            
            // 根据级别数字判断
            if (rankStr.includes('1') || rankStr.includes('一级')) return '正国级';
            if (rankStr.includes('2') || rankStr.includes('二级')) return '副国级';
            if (rankStr.includes('3') || rankStr.includes('三级')) return '正部级';
            if (rankStr.includes('4') || rankStr.includes('四级')) return '副部级';
            if (rankStr.includes('5') || rankStr.includes('五级')) return '正厅级';
            if (rankStr.includes('6') || rankStr.includes('六级')) return '副厅级';
            if (rankStr.includes('7') || rankStr.includes('七级')) return '正处级';
            if (rankStr.includes('8') || rankStr.includes('八级')) return '副处级';
            if (rankStr.includes('9') || rankStr.includes('九级')) return '正科级';
            if (rankStr.includes('10') || rankStr.includes('十级')) return '副科级';
            
            console.log(`⚠️ 无法标准化级别: "${rank}"`);
            return '无级别';
        }
        
        // Get experience range
        const experienceRange = d3.extent(rankingData, d => d.experienceIndex);
        const maxExperience = experienceRange[1] || 1;
        
        // Matrix dimensions
        const cellSize = 40;
        const matrixWidth = maxExperience * cellSize + margin.left + margin.right;
        const matrixHeight = rankHierarchy.length * cellSize + margin.top + margin.bottom;
        
        // Update SVG size
        svg.attr('width', matrixWidth).attr('height', matrixHeight);
        
        // Create scales
        const xScale = d3.scaleBand()
            .domain(d3.range(1, maxExperience + 1))
            .range([margin.left, matrixWidth - margin.right])
            .padding(0.1);
            
        const yScale = d3.scaleBand()
            .domain(rankHierarchy)
            .range([margin.top, matrixHeight - margin.bottom])
            .padding(0.1);
        
        // Draw axes
        svg.append('g')
            .attr('transform', `translate(0, ${matrixHeight - margin.bottom})`)
            .call(d3.axisBottom(xScale).tickFormat(d => `经历${d}`));
        
        svg.append('g')
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(d3.axisLeft(yScale));
        
        // Draw matrix background (all blue cells)
        svg.selectAll('.matrix-cell-bg')
            .data(d3.cross(d3.range(1, maxExperience + 1), rankHierarchy))
            .enter()
            .append('rect')
            .attr('class', 'matrix-cell-bg')
            .attr('x', d => xScale(d[0]))
            .attr('y', d => yScale(d[1]))
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .attr('fill', '#e3f2fd') // Light blue background
            .attr('stroke', '#90caf9')
            .attr('stroke-width', 1);
        
        // Draw active rank cells (red for actual positions)
        const rankMatrix = [];
        console.log('🎯 Standardizing ranks for matrix:');
        rankingData.forEach(d => {
            const standardRank = standardizeRank(d.rank);
            console.log(`  经历${d.experienceIndex}: "${d.rank}" → "${standardRank}"`);
            rankMatrix.push({
                experience: d.experienceIndex,
                rank: standardRank,
                originalData: d
            });
        });
        
        console.log('🎨 Final rank matrix:', rankMatrix);
        
        svg.selectAll('.matrix-cell-active')
            .data(rankMatrix)
            .enter()
            .append('rect')
            .attr('class', 'matrix-cell-active')
            .attr('x', d => xScale(d.experience))
            .attr('y', d => yScale(d.rank))
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .attr('fill', '#e74c3c') // Red for active positions
            .attr('stroke', '#c0392b')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                // Highlight effect
                d3.select(this).attr('stroke-width', 4);
                
                // Add tooltip
                const tooltip = d3.select('body').append('div')
                    .attr('class', 'tooltip')
                    .style('position', 'absolute')
                    .style('background', 'rgba(0, 0, 0, 0.9)')
                    .style('color', 'white')
                    .style('padding', '12px')
                    .style('border-radius', '0')
                    .style('border', '2px solid #333')
                    .style('font-family', 'retro, sans-serif')
                    .style('pointer-events', 'none')
                    .style('opacity', 0)
                    .style('z-index', '1000');
                
                tooltip.transition()
                    .duration(200)
                    .style('opacity', 1);
                
                tooltip.html(`
                    <strong>📋 经历 ${d.originalData.experienceIndex}</strong><br/>
                    <strong>职位:</strong> ${d.originalData.position}<br/>
                    <strong>级别:</strong> ${d.rank}<br/>
                    <strong>地点:</strong> ${d.originalData.location}<br/>
                    <strong>时间:</strong> ${d.originalData.dateStr}
                `)
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this).attr('stroke-width', 2);
                d3.selectAll('.tooltip').remove();
            });
        
        // Add title and axis labels
        svg.append('text')
            .attr('x', matrixWidth / 2)
            .attr('y', margin.top / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '18px')
            .style('font-weight', 'bold')
            .style('font-family', 'retro, sans-serif')
            .text(`${officialName} - 职级矩阵图`);
            
        // X轴标签
        svg.append('text')
            .attr('x', matrixWidth / 2)
            .attr('y', matrixHeight - 5)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-family', 'retro, sans-serif')
            .text('经历序号');
            
        // Y轴标签
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -matrixHeight / 2)
            .attr('y', 15)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-family', 'retro, sans-serif')
            .text('职务级别 (上级到下级)');
        
        // Add legend
        const legendContainer = d3.select('#visualizationArea')
            .append('div')
            .style('margin-top', '20px')
            .style('padding', '15px')
            .style('border', '2px solid #333')
            .style('background', '#fff')
            .style('border-radius', '0')
            .style('box-shadow', '4px 4px 0px #333');
        
        legendContainer.append('h4')
            .style('font-family', 'retro, sans-serif')
            .style('color', '#333')
            .style('margin-bottom', '10px')
            .text('图例说明');
        
        const legendItems = legendContainer.append('div')
            .style('display', 'flex')
            .style('gap', '30px')
            .style('align-items', 'center');
        
        // Blue background legend
        const blueItem = legendItems.append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px');
        
        blueItem.append('div')
            .style('width', '20px')
            .style('height', '20px')
            .style('background', '#e3f2fd')
            .style('border', '1px solid #90caf9');
        
        blueItem.append('span')
            .style('font-family', 'retro, sans-serif')
            .text('未任职级别');
        
        // Red active legend
        const redItem = legendItems.append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px');
        
        redItem.append('div')
            .style('width', '20px')
            .style('height', '20px')
            .style('background', '#e74c3c')
            .style('border', '2px solid #c0392b');
        
        redItem.append('span')
            .style('font-family', 'retro, sans-serif')
            .text('实际任职级别');
        
        // Add summary statistics
        if (rankingData.length > 0) {
            const summaryContainer = d3.select('#visualizationArea')
                .append('div')
                .style('margin-top', '20px')
                .style('padding', '15px')
                .style('border', '2px solid #333')
                .style('background', '#f8f9fa')
                .style('border-radius', '0')
                .style('box-shadow', '4px 4px 0px #333');
            
            summaryContainer.append('h4')
                .style('font-family', 'retro, sans-serif')
                .style('color', '#333')
                .style('margin-bottom', '15px')
                .text('📊 职级发展统计');
            
            const uniqueRanks = [...new Set(rankMatrix.map(d => d.rank))];
            const rankCounts = {};
            rankMatrix.forEach(d => {
                rankCounts[d.rank] = (rankCounts[d.rank] || 0) + 1;
            });
            
            const statsGrid = summaryContainer.append('div')
                .style('display', 'grid')
                .style('grid-template-columns', 'repeat(auto-fit, minmax(200px, 1fr))')
                .style('gap', '15px');
            
            statsGrid.append('div').html(`<strong>总经历数:</strong> ${rankingData.length}`);
            statsGrid.append('div').html(`<strong>涉及级别:</strong> ${uniqueRanks.length} 种`);
            statsGrid.append('div').html(`<strong>最高级别:</strong> ${rankMatrix.length > 0 ? rankMatrix[0].rank : '无'}`);
            
            // Show rank distribution
            const rankDistContainer = summaryContainer.append('div')
                .style('margin-top', '15px');
            
            rankDistContainer.append('h5')
                .style('font-family', 'retro, sans-serif')
                .style('margin-bottom', '10px')
                .text('级别分布:');
            
            Object.entries(rankCounts).forEach(([rank, count]) => {
                rankDistContainer.append('div')
                    .style('margin', '5px 0')
                    .style('font-family', 'retro, sans-serif')
                    .html(`• ${rank}: ${count} 次`);
            });
        } else {
            // Show message if no ranking data
            $('#visualizationArea').append(`
                <div style="margin-top: 20px; padding: 20px; border: 2px solid #e74c3c; background: #fff;">
                    <h4 style="color: #e74c3c;">⚠️ 无法生成职级轨迹图</h4>
                    <p>找到的记录中缺少必要的职级或时间信息。请检查数据质量或尝试地理轨迹图。</p>
                </div>
            `);
        }
    }
    
    function createRankMosaic(rankingData, officialName) {
        console.log('Creating rank mosaic with data:', rankingData);
        
        if (rankingData.length === 0) {
            console.log('No ranking data available for mosaic');
            return;
        }
        
        // 创建显示经历轨迹的马赛克图，横坐标是经历序号
        const mosaicContainer = d3.select('#visualizationArea')
            .append('div')
            .style('margin-top', '20px')
            .style('padding', '20px')
            .style('border', '2px solid #333')
            .style('background', '#fff')
            .style('border-radius', '0')
            .style('box-shadow', '4px 4px 0px #333');
        
        mosaicContainer.append('h4')
            .text(`${officialName} - 经历轨迹马赛克图`);
        
        const width = Math.max(800, rankingData.length * 40);
        const cellWidth = Math.max(30, (width - 100) / rankingData.length);
        const cellHeight = 60;
        
        const mosaicSvg = mosaicContainer.append('svg')
            .attr('width', width)
            .attr('height', 150);
        
        // 为每个经历创建一个格子
        rankingData.forEach((d, i) => {
            const x = 50 + i * cellWidth;
            
            // 根据级别设置颜色：默认蓝色，当年级别红色
            // 这里假设当年级别是包含“副”、“正”等关键字的高级别
            const isHighLevel = d.rank && (d.rank.includes('副') || d.rank.includes('正') || d.rank.includes('局') || d.rank.includes('部'));
            const fillColor = isHighLevel ? '#e74c3c' : '#3498db'; // 红色为高级，蓝色为普通
            
            // 绘制格子
            mosaicSvg.append('rect')
                .attr('x', x)
                .attr('y', 30)
                .attr('width', cellWidth - 2)
                .attr('height', cellHeight)
                .attr('fill', fillColor)
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
                .on('mouseover', function(event) {
                    // 添加提示框
                    const tooltip = d3.select('body').append('div')
                        .attr('class', 'tooltip')
                        .style('position', 'absolute')
                        .style('background', 'rgba(0, 0, 0, 0.8)')
                        .style('color', 'white')
                        .style('padding', '10px')
                        .style('border-radius', '5px')
                        .style('pointer-events', 'none')
                        .style('opacity', 0);
                    
                    tooltip.transition()
                        .duration(200)
                        .style('opacity', 1);
                    
                    tooltip.html(`
                        <strong>经历 ${d.experienceIndex}</strong><br/>
                        职位: ${d.position}<br/>
                        级别: ${d.rank}<br/>
                        地点: ${d.location}<br/>
                        时间: ${d.dateStr}
                    `)
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 28) + 'px');
                })
                .on('mouseout', function() {
                    d3.selectAll('.tooltip').remove();
                });
            
            // 添加经历序号标签
            mosaicSvg.append('text')
                .attr('x', x + cellWidth/2)
                .attr('y', 110)
                .attr('text-anchor', 'middle')
                .style('font-size', '12px')
                .style('font-family', 'retro1, sans-serif')
                .text(`${d.experienceIndex}`);
                
            // 在格子中显示级别缩写
            const rankAbbr = d.rank ? d.rank.substring(0, 2) : '未知';
            if (cellWidth > 25) {
                mosaicSvg.append('text')
                    .attr('x', x + cellWidth/2)
                    .attr('y', 65)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '10px')
                    .style('fill', 'white')
                    .style('font-weight', 'bold')
                    .text(rankAbbr);
            }
        });
        
        // 添加图例
        const legend = mosaicSvg.append('g')
            .attr('transform', 'translate(50, 130)');
            
        legend.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', '#3498db');
            
        legend.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .style('font-size', '12px')
            .text('普通职务');
            
        legend.append('rect')
            .attr('x', 100)
            .attr('y', 0)
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', '#e74c3c');
            
        legend.append('text')
            .attr('x', 120)
            .attr('y', 12)
            .style('font-size', '12px')
            .text('高级职务');
    }
    
    function drawGeographyVisualization(records, officialName) {
        console.log('Drawing geography visualization for:', officialName);
        
        // Clear previous visualization
        $('#visualizationArea').html('');
        
        // Add loading indicator
        const loadingDiv = $('#visualizationArea').append(`
            <div id="map-loading" style="
                text-align: center; 
                padding: 50px; 
                color: #666;
                border: 2px solid #3498db;
                background: #fff;
                margin-bottom: 20px;
            ">
                <i class="fa fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i>
                <p>正在加载中国地图数据...</p>
            </div>
        `);
        
        // Process geographic data
        console.log('🗺️ Processing geographic data...');
        const geoData = processGeographicData(records);
        console.log('Processed geographic data:', geoData);
        
        // Create geographic trajectory visualization
        const width = 900;
        const height = 700;
        
        console.log('🎨 Creating SVG canvas:', width, 'x', height);
        
        const svg = d3.select('#visualizationArea')
            .append('svg')
            .attr('width', '100%')
            .attr('height', height + 'px')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .style('border', '2px solid #333')
            .style('background', '#ffffff');
        
        // Load China map data from online sources (based on test file)
        const loadChinaMap = async () => {
            console.log('🗺️ Loading China map from online source...');
            
            const mapSources = [
                'https://raw.githubusercontent.com/longwosion/geojson-map-china/master/china.json',
                'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json',
                'https://raw.githubusercontent.com/pissang/starbucks/master/data/china.json'
            ];
            
            for (const source of mapSources) {
                try {
                    console.log(`🌐 Trying to load from: ${source}`);
                    const response = await fetch(source);
                    
                    if (!response.ok) {
                        console.warn(`❌ HTTP ${response.status} from ${source}`);
                        continue;
                    }
                    
                    const mapData = await response.json();
                    console.log(`📦 Data loaded from ${source}, validating...`);
                    
                    if (!mapData.features || !Array.isArray(mapData.features)) {
                        console.warn(`❌ Invalid data format from ${source}: missing features array`);
                        continue;
                    }
                    
                    console.log(`✅ Found ${mapData.features.length} geographic features from ${source}`);
                    return mapData;
                    
                } catch (error) {
                    console.warn(`❌ Failed to load from ${source}:`, error.message);
                }
            }
            
            console.warn('❌ All map data sources failed');
            return null;
        };
        
        // Load map and render (updated based on test file)
        loadChinaMap().then(chinaMapData => {
            // Remove loading indicator
            $('#map-loading').remove();
            
            // Add status indicator
            svg.append('text')
                .attr('x', 10)
                .attr('y', 20)
                .style('font-size', '12px')
                .style('fill', '#666')
                .text(`Status: ${chinaMapData ? `Map loaded (${chinaMapData.features?.length || 0} features)` : 'Map failed to load'}`);
            
            console.log('🗺️ Map loading promise resolved, data:', chinaMapData ? 'loaded' : 'null');
            
            // Add a background to the SVG to make it visible
            svg.append('rect')
                .attr('width', width)
                .attr('height', height)
                .attr('fill', '#f8fafc')
                .attr('stroke', '#e2e8f0')
                .attr('stroke-width', 1);
            
            if (!chinaMapData) {
                console.warn('❌ No map data available, displaying error message');
                svg.append('text')
                    .attr('x', width / 2)
                    .attr('y', height / 2)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '18px')
                    .style('fill', '#e74c3c')
                    .text('❌ 地图数据加载失败');
                return;
            }
            
            console.log('🗺️ Rendering China map...');
            console.log('📏 SVG dimensions:', width, 'x', height);
            console.log('📋 Map data:', chinaMapData.features.length, 'features');
            
            // Add map group container (same as test file)
            const g = svg.append("g");
            
            // Set up projection (using test file approach)
            console.log('📐 Setting up map projection...');
            const projection = d3.geoMercator()
                .fitSize([width, height], chinaMapData);
             
            const path = d3.geoPath().projection(projection);
            console.log('📐 Projection setup completed');
            
            // Draw China map (using test file approach)
            console.log(`🎨 Drawing ${chinaMapData.features.length} geographic features...`);
            
            const countryPaths = g.selectAll('.country')
                .data(chinaMapData.features)
                .enter()
                .append('path')
                .attr('class', 'country')
                .attr('d', path)
                .attr('fill', '#64748b')  // 更现代的灰色
                .attr('stroke', '#ffffff')   // 纯白色边框
                .attr('stroke-width', 0.8)
                .style('cursor', 'default');  // 不显示指针，因为不响应hover
             
            console.log(`✅ Map rendered successfully with ${countryPaths.size()} paths`);
            
            // Add visual confirmation
            svg.append('text')
                .attr('x', 10)
                .attr('y', 40)
                .style('font-size', '12px')
                .style('fill', '#27ae60')
                .text(`✅ Map paths rendered: ${countryPaths.size()}`);
            
            // Verify projection bounds
            const bounds = path.bounds(chinaMapData);
            console.log('📍 Map bounds:', bounds);
            
            // Add debugging info for projection
            svg.append('text')
                .attr('x', 10)
                .attr('y', 60)
                .style('font-size', '12px')
                .style('fill', '#666')
                .text(`Bounds: [${bounds[0][0].toFixed(1)}, ${bounds[0][1].toFixed(1)}] to [${bounds[1][0].toFixed(1)}, ${bounds[1][1].toFixed(1)}]`);
            
            
            //UNCOMMENTED
            // Filter data to only include records with coordinates
            const validGeoData = geoData.filter(d => d.hasCoordinates);
            console.log('Valid geo data with coordinates:', validGeoData.length);
            
            if (validGeoData.length === 0) {
                console.log('⚠️ 没有有效坐标数据，显示地名列表');
                svg.append('text')
                    .attr('x', width/2)
                    .attr('y', height/2 - 50)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '18px')
                    .style('font-weight', 'bold')
                    .text(`${officialName} - 工作地点列表`);
                
                svg.append('text')
                    .attr('x', width/2)
                    .attr('y', height/2)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '14px')
                    .style('fill', '#666')
                    .text('找到地点信息但无法获取坐标，请查看下方详细列表');
                
                createLocationList(records, officialName);
                return;
            }
            
            // 创建轨迹线组（在地图上面）
            const trajectoryGroup = svg.append('g').attr('class', 'trajectory-group');
            
            // 创建位置点组（在轨迹线上面）
            const pointsGroup = svg.append('g').attr('class', 'points-group');
            
            // Draw trajectory lines with thinner lines
            if (validGeoData.length > 1) {
                console.log('🔗 Drawing trajectory lines for', validGeoData.length, 'points');
                
                const line = d3.line()
                    .x(d => {
                        const projected = projection([d.longitude, d.latitude]);
                        return projected ? projected[0] : width/2;
                    })
                    .y(d => {
                        const projected = projection([d.longitude, d.latitude]);
                        return projected ? projected[1] : height/2;
                    })
                    .curve(d3.curveBasis); // 使用曲线使轨迹更平滑
                
                // 绘制轨迹背景线（更粗，较浅色）
                trajectoryGroup.append('path')
                    .datum(validGeoData)
                    .attr('fill', 'none')
                    .attr('stroke', '#fbbf24')
                    .attr('stroke-width', 5)
                    .attr('opacity', 0.6)
                    .attr('d', line);
                
                // 绘制主轨迹线
                trajectoryGroup.append('path')
                    .datum(validGeoData)
                    .attr('fill', 'none')
                    .attr('stroke', '#ea580c') // 鲜明的橙红色，非常显眼
                    .attr('stroke-width', 3)
                    .attr('stroke-dasharray', '10,5')
                    .attr('opacity', 0.95)
                    .attr('d', line);
                    
                console.log('✅ Trajectory lines drawn successfully');
            }
            
            // Draw location points (small dots)
            console.log('📍 Drawing', validGeoData.length, 'location points...');
            
            pointsGroup.selectAll('.location-point')
                .data(validGeoData)
                .enter()
                .append('circle')
                .attr('class', 'location-point')
                .attr('cx', d => {
                    const projected = projection([d.longitude, d.latitude]);
                    return projected ? projected[0] : width/2;
                })
                .attr('cy', d => {
                    const projected = projection([d.longitude, d.latitude]);
                    return projected ? projected[1] : height/2;
                })
                .attr('r', 7) // 稍大一点的点
                .attr('fill', '#ef4444') // 现代红色
                .attr('stroke', '#ffffff')
                .attr('stroke-width', 2.5)
                .attr('opacity', 0.95)
                .style('cursor', 'pointer')
                .style('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))') // 添加阴影
                .on('mouseover', function(event, d) {
                    // Highlight the point
                    d3.select(this)
                        .attr('r', 10)
                        .attr('stroke-width', 3);
                    
                    const tooltip = d3.select('body').append('div')
                        .attr('class', 'tooltip')
                        .style('position', 'absolute')
                        .style('background', 'rgba(15, 23, 42, 0.95)') // 深色背景
                        .style('color', 'white')
                        .style('padding', '16px')
                        .style('border-radius', '8px')
                        .style('font-family', 'retro, sans-serif')
                        .style('font-size', '13px')
                        .style('pointer-events', 'none')
                        .style('opacity', 0)
                        .style('z-index', '1000')
                        .style('box-shadow', '0 10px 25px rgba(0,0,0,0.5)')
                        .style('border', '1px solid rgba(255,255,255,0.1)');
                    
                    tooltip.transition()
                        .duration(200)
                        .style('opacity', 1);
                    
                    tooltip.html(`
                        <div style="font-weight: bold; margin-bottom: 4px;">📍 ${d.location}</div>
                        <div><strong>职位:</strong> ${d.position}</div>
                        <div><strong>时间:</strong> ${d.dateStr}</div>
                        <div><strong>经历:</strong> 第${d.experienceIndex}个</div>
                    `)
                        .style('left', (event.pageX + 15) + 'px')
                        .style('top', (event.pageY - 10) + 'px');
                })
                .on('mouseout', function() {
                    d3.select(this)
                        .attr('r', 7)
                        .attr('stroke-width', 2.5);
                    d3.selectAll('.tooltip').remove();
                });
            

            //UNCOMMENTED_END
            
            // Add title with improved styling
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', 35)
                .attr('text-anchor', 'middle')
                .style('font-size', '22px')
                .style('font-weight', 'bold')
                .style('font-family', 'retro, sans-serif')
                .style('fill', '#1e293b')
                .style('text-shadow', '2px 2px 4px rgba(0,0,0,0.1)')
                .text(`${officialName} - 地理轨迹图`);
            
            // Add subtitle
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', 55)
                .attr('text-anchor', 'middle')
                .style('font-size', '14px')
                .style('font-family', 'retro, sans-serif')
                .style('fill', '#64748b')
                .text(`工作地点轨迹 • ${validGeoData.length} 个地点`);
            
            console.log('🎉 Geographic visualization completed!');
            
            // Create location list
            createLocationList(records, officialName);
        });
        

    }
    
    function createLocationList(records, officialName) {
        console.log('📝 Creating location list for', records.length, 'records');
        
        // Get field mapping
        const fields = identifyFields(records);
        
        // Extract location information
        const locationData = [];
        records.forEach((record, index) => {
            const experienceIndex = record[fields.experienceIndex] || index + 1;
            const startDate = record[fields.startDate] || record[fields.date];
            const position = record[fields.position] || record['具体职务'] || record['职务一级关键词'] || '未知职位';
            const province = record[fields.province] || '';
            const city = record[fields.city] || '';
            const district = record[fields.district] || '';
            const location = record[fields.location] || [province, city, district].filter(l => l).join('') || '未知地点';
            
            const date = parseDate(startDate);
            const dateStr = date ? date.toISOString().split('T')[0] : (startDate ? startDate.toString() : `记录${index + 1}`);
            
            locationData.push({
                experienceIndex: parseInt(experienceIndex) || index + 1,
                location: location,
                province: province,
                city: city,
                district: district,
                position: position,
                dateStr: dateStr,
                startDate: startDate
            });
        });
        
        // Sort by experience index
        locationData.sort((a, b) => a.experienceIndex - b.experienceIndex);
        
        // Create location list container
        const listContainer = d3.select('#visualizationArea')
            .append('div')
            .style('margin-top', '20px')
            .style('padding', '20px')
            .style('border', '2px solid #333')
            .style('background', '#fff')
            .style('border-radius', '0')
            .style('box-shadow', '4px 4px 0px #333');
        
        listContainer.append('h3')
            .style('font-family', 'retro, sans-serif')
            .style('color', '#333')
            .style('margin-bottom', '15px')
            .text(`${officialName} - 工作地点详单`);
        
        // Statistics
        const uniqueProvinces = [...new Set(locationData.map(d => d.province).filter(p => p))];
        const uniqueCities = [...new Set(locationData.map(d => d.city).filter(c => c))];
        
        const statsDiv = listContainer.append('div')
            .style('margin-bottom', '20px')
            .style('padding', '15px')
            .style('background', '#f8f9fa')
            .style('border', '1px solid #dee2e6');
        
        statsDiv.append('h4')
            .style('font-family', 'retro, sans-serif')
            .style('margin-bottom', '10px')
            .text('📊 地理分布统计');
        
        const statsGrid = statsDiv.append('div')
            .style('display', 'grid')
            .style('grid-template-columns', 'repeat(auto-fit, minmax(200px, 1fr))')
            .style('gap', '15px');
        
        statsGrid.append('div').html(`<strong>总工作地点:</strong> ${locationData.length} 个`);
        statsGrid.append('div').html(`<strong>涉及省份:</strong> ${uniqueProvinces.length} 个`);
        statsGrid.append('div').html(`<strong>涉及城市:</strong> ${uniqueCities.length} 个`);
        
        if (uniqueProvinces.length > 0) {
            statsGrid.append('div').html(`<strong>主要省份:</strong> ${uniqueProvinces.slice(0, 3).join('、')}`);
        }
        
        // Create timeline list
        const timelineDiv = listContainer.append('div');
        timelineDiv.append('h4')
            .style('font-family', 'retro, sans-serif')
            .style('color', '#333')
            .style('margin-bottom', '15px')
            .text('🗓️ 时间地点轨迹');
        
        const timeline = timelineDiv.append('div')
            .style('max-height', '400px')
            .style('overflow-y', 'auto')
            .style('border', '1px solid #ddd')
            .style('padding', '10px');
        
        locationData.forEach((d, index) => {
            const item = timeline.append('div')
                .style('padding', '12px')
                .style('margin', '8px 0')
                .style('border-left', '4px solid #3498db')
                .style('padding-left', '20px')
                .style('background', index % 2 === 0 ? '#ffffff' : '#f8f9fa')
                .style('border-radius', '0');
            
            // Header with experience number and date
            const header = item.append('div')
                .style('margin-bottom', '8px');
                
            header.append('strong')
                .style('color', '#2c3e50')
                .style('font-size', '14px')
                .style('font-family', 'retro, sans-serif')
                .text(`经历 ${d.experienceIndex}: ${d.dateStr}`);
            
            // Position
            const positionLine = item.append('div')
                .style('margin-bottom', '4px');
                
            positionLine.append('span')
                .style('font-weight', 'bold')
                .style('color', '#e74c3c')
                .text(d.position);
            
            // Location details
            const locationLine = item.append('div')
                .style('color', '#7f8c8d')
                .style('font-size', '13px');
                
            if (d.province || d.city || d.district) {
                const locationParts = [d.province, d.city, d.district].filter(p => p);
                locationLine.html(`📍 ${locationParts.join(' → ')}`);
            } else {
                locationLine.html(`📍 ${d.location}`);
            }
        });
        
        console.log('✅ Location list created with', locationData.length, 'items');
    }
    
    function processRankingData(records) {
        const rankingData = [];
        
        if (records.length === 0) return rankingData;
        
        // Get field mapping for smart field identification
        const fields = identifyFields(records);
        console.log('Processing ranking data with field mapping:', fields);
        
        records.forEach((record, index) => {
            // Use smart field identification
            const experienceIndex = record[fields.experienceIndex] || index + 1;
            const startDate = record[fields.startDate] || record[fields.date];
            const endDate = record[fields.endDate];
            
            // Get position information - try multiple fields
            let position = record[fields.position] || '';
            if (!position || typeof position !== 'string' || position.trim() === '') {
                // Try alternative position fields
                position = record['具体职务'] || record['职务一级关键词'] || record['职务二级关键词'] || '未知职位';
            }
            
            // Get rank information - try multiple fields
            let level = record[fields.rank] || '';
            if (!level || typeof level !== 'string' || level.trim() === '') {
                // Try alternative rank fields
                level = record['级别'] || record['地区级别'] || extractRankFromPosition(position);
            }
            
            const province = record[fields.province] || '';
            const city = record[fields.city] || '';
            const district = record[fields.district] || '';
            const location = record[fields.location] || [province, city, district].filter(l => l).join('') || '未知地点';
            
            // Always process the record if we have basic information
            const hasValidData = true; // We'll include all records for completeness
            
            console.log(`Processing record ${index + 1}:`, {
                experienceIndex: experienceIndex,
                startDate: startDate,
                position: position,
                level: level,
                location: location
            });
            
            if (hasValidData) {
                const date = parseDate(startDate);
                const dateStr = date ? date.toISOString().split('T')[0] : (startDate ? startDate.toString() : `记录${index + 1}`);
                
                rankingData.push({
                    experienceIndex: parseInt(experienceIndex) || index + 1,
                    rank: level || extractRankFromPosition(position) || '未知等级',
                    position: position || '未知职位',
                    location: location,
                    province: province,
                    city: city,
                    district: district,
                    date: date,
                    startDate: startDate || '',
                    endDate: endDate || '',
                    dateStr: dateStr
                });
            }
        });
        
        // 按经历序号排序
        rankingData.sort((a, b) => a.experienceIndex - b.experienceIndex);
        
        console.log('Processed ranking data:', rankingData.length, 'records');
        if (rankingData.length > 0) {
            console.log('Sample ranking record:', rankingData[0]);
        }
        
        return rankingData;
    }
    
    function processGeographicData(records) {
        const geoData = [];
        
        if (records.length === 0) return geoData;
        
        // Get field mapping for smart field identification
        const fields = identifyFields(records);
        console.log('Processing geographic data with field mapping:', fields);
        

        
        records.forEach((record, index) => {
            // Use smart field identification
            const experienceIndex = record[fields.experienceIndex] || index + 1;
            const startDate = record[fields.startDate] || record[fields.date];
            const position = record[fields.position] || '未知职位';
            const province = record[fields.province] || '';
            const city = record[fields.city] || '';
            const district = record[fields.district] || '';
            
            // 优先使用地方二级关键词（市级），然后是地方一级关键词（省级）
            let targetLocation = '';
            if (city && city.trim() !== '') {
                targetLocation = city.trim();
                console.log(`Processing record ${index + 1}: Using city - ${targetLocation}`);
            } else if (province && province.trim() !== '') {
                targetLocation = province.trim();
                console.log(`Processing record ${index + 1}: Using province - ${targetLocation}`);
            }
            
            if (targetLocation) {
                let lat, lng;
                let coordinateSource = '';
                
                // 尝试从加载的城市坐标数据中找到坐标
                if (politicalMobilityData) {
                    let node = findLocationNode(targetLocation, politicalMobilityData.nodes);
                    
                    if (node) {
                        lat = node.Latitude;
                        lng = node.Longitude;
                        coordinateSource = 'csv_coordinates';
                        console.log(`✅ Found CSV coordinates for ${targetLocation}:`, lat, lng);
                    } else {
                        console.log(`❌ No coordinates found for ${targetLocation} in CSV data`);
                    }
                }
                
                // 创建地理记录
                const date = parseDate(startDate);
                const geoRecord = {
                    experienceIndex: parseInt(experienceIndex) || index + 1,
                    location: targetLocation,
                    originalProvince: province,
                    originalCity: city,
                    district: district,
                    position: position,
                    latitude: lat ? parseFloat(lat) : null,
                    longitude: lng ? parseFloat(lng) : null,
                    date: date,
                    dateStr: date ? date.toISOString().split('T')[0] : (startDate ? startDate.toString() : `记录${index + 1}`),
                    hasCoordinates: !!(lat && lng),
                    coordinateSource: coordinateSource
                };
                
                geoData.push(geoRecord);
            }
        });
        
        // 按经历序号排序
        geoData.sort((a, b) => a.experienceIndex - b.experienceIndex);
        
        console.log('🗺️ Processed geographic data:', geoData.length, 'records');
        console.log('📍 Records with coordinates:', geoData.filter(d => d.hasCoordinates).length);
        if (geoData.length > 0) {
            console.log('📝 Sample geographic record:', geoData[0]);
        }
        
        return geoData;
    }
    

    
    // 在政治移动数据中查找位置节点 - 使用字典优化查找
    function findLocationNode(targetLocation, nodes) {
        // 如果有字典结构，优先使用字典查找
        if (politicalMobilityData && politicalMobilityData.dict) {
            const dict = politicalMobilityData.dict;
            
            // 1. 精确匹配
            if (dict[targetLocation]) {
                console.log(`🎯 Found exact match for "${targetLocation}"`);
                return dict[targetLocation];
            }
            
            // 2. 去掉后缀匹配
            const cleanTarget = targetLocation.replace(/[市县区省自治区特别行政区]/g, '');
            if (cleanTarget !== targetLocation && dict[cleanTarget]) {
                console.log(`🎯 Found clean match for "${targetLocation}" → "${cleanTarget}"`);
                return dict[cleanTarget];
            }
            
            // 3. 部分匹配 - 在字典键中查找
            for (const key in dict) {
                if (key.includes(cleanTarget) || cleanTarget.includes(key)) {
                    if (cleanTarget.length >= 2 && key.length >= 2) {
                        console.log(`🎯 Found partial match for "${targetLocation}" → "${key}"`);
                        return dict[key];
                    }
                }
            }
            
            console.log(`❌ No coordinates found for "${targetLocation}" in dictionary`);
            return null;
        }
        
        // 备用方案：使用传统节点数组查找（向后兼容）
        if (!nodes || !Array.isArray(nodes)) {
            console.log(`❌ No valid nodes array for location lookup`);
            return null;
        }
        
        // 精确匹配
        let node = nodes.find(n => n.Name === targetLocation);
        if (node) {
            console.log(`🎯 Found exact match in nodes for "${targetLocation}"`);
            return node;
        }
        
        // 去掉后缀匹配
        const cleanTarget = targetLocation.replace(/[市县区省自治区特别行政区]/g, '');
        node = nodes.find(n => {
            const cleanNodeName = n.Name.replace(/[市县区省自治区特别行政区]/g, '');
            return cleanNodeName === cleanTarget;
        });
        if (node) {
            console.log(`🎯 Found clean match in nodes for "${targetLocation}" → "${cleanTarget}"`);
            return node;
        }
        
        // 包含匹配
        node = nodes.find(n => 
            n.Name.includes(cleanTarget) || 
            cleanTarget.includes(n.Name) ||
            (cleanTarget.length >= 2 && n.Name.includes(cleanTarget))
        );
        
        if (node) {
            console.log(`🎯 Found partial match in nodes for "${targetLocation}"`);
        } else {
            console.log(`❌ No coordinates found for "${targetLocation}" in nodes array`);
        }
        
        return node || null;
    }
    
    function generateOfficialReport(records, officialName) {
        // Generate a comprehensive report about the official
        const reportContainer = d3.select('#visualizationArea')
            .append('div')
            .style('margin-top', '30px')
            .style('padding', '20px')
            .style('border', '2px solid #333')
            .style('border-radius', '0')
            .style('background-color', '#f9f9f9')
            .style('box-shadow', '4px 4px 0px #333');
        
        reportContainer.append('h3')
            .style('font-family', 'retro, sans-serif')
            .style('color', '#333')
            .text(`${officialName} - 详细报告`);
        
        if (records.length === 0) {
            reportContainer.append('p')
                .style('color', '#e74c3c')
                .text('没有找到相关记录数据');
            return;
        }
        
        // Get field mapping for smart field identification
        const fields = identifyFields(records);
        console.log('Generating report with field mapping:', fields);
        
        // Extract data using smart field identification
        const positions = [...new Set(records.map(r => {
            const pos = r[fields.position] || '未知职位';
            return pos.toString().trim();
        }).filter(p => p && p !== '未知职位'))];
        
        const locations = [...new Set(records.map(r => {
            const loc = r[fields.location] || 
                      [r[fields.province], r[fields.city], r[fields.district]].filter(l => l).join('') || 
                      '未知地点';
            return loc.toString().trim();
        }).filter(l => l && l !== '未知地点'))];
        
        const ranks = [...new Set(records.map(r => {
            const rank = r[fields.rank] || extractRankFromPosition(r[fields.position] || '') || '未知级别';
            return rank.toString().trim();
        }).filter(r => r && r !== '未知级别'))];
        
        // Basic statistics
        const statsDiv = reportContainer.append('div')
            .style('margin-bottom', '20px')
            .style('padding', '15px')
            .style('background', '#e8f5e8')
            .style('border', '1px solid #27ae60');
        
        statsDiv.append('h4')
            .style('color', '#27ae60')
            .style('margin-bottom', '15px')
            .text('📊 基本统计信息');
        
        const statsGrid = statsDiv.append('div')
            .style('display', 'grid')
            .style('grid-template-columns', 'repeat(auto-fit, minmax(200px, 1fr))')
            .style('gap', '10px');
        
        statsGrid.append('div').html(`<strong>记录总数:</strong> ${records.length} 条`);
        statsGrid.append('div').html(`<strong>任职数量:</strong> ${positions.length} 个`);
        statsGrid.append('div').html(`<strong>工作地点:</strong> ${locations.length} 个`);
        statsGrid.append('div').html(`<strong>职务级别:</strong> ${ranks.length} 种`);
        
        // Show identified fields
        const fieldsDiv = reportContainer.append('div')
            .style('margin-bottom', '20px')
            .style('padding', '15px')
            .style('background', '#fff3cd')
            .style('border', '1px solid #ffc107');
        
        fieldsDiv.append('h4')
            .style('color', '#856404')
            .style('margin-bottom', '15px')
            .text('🔍 识别的数据字段');
        
        const fieldsList = fieldsDiv.append('div')
            .style('display', 'grid')
            .style('grid-template-columns', 'repeat(auto-fit, minmax(200px, 1fr))')
            .style('gap', '5px')
            .style('font-size', '13px');
        
        Object.entries(fields).forEach(([key, value]) => {
            if (value) {
                fieldsList.append('div').html(`<strong>${key}:</strong> ${value}`);
            }
        });
        
        // Position history
        if (positions.length > 0) {
            const positionsDiv = reportContainer.append('div')
                .style('margin-bottom', '20px');
            
            positionsDiv.append('h4')
                .style('color', '#333')
                .text('💼 职位历程');
            
            const positionGrid = positionsDiv.append('div')
                .style('display', 'grid')
                .style('grid-template-columns', 'repeat(auto-fit, minmax(250px, 1fr))')
                .style('gap', '10px');
            
            positions.forEach(pos => {
                positionGrid.append('div')
                    .style('padding', '8px')
                    .style('background', '#f8f9fa')
                    .style('border', '1px solid #dee2e6')
                    .style('border-radius', '0')
                    .text(pos);
            });
        }
        
        // Location history
        if (locations.length > 0) {
            const locationsDiv = reportContainer.append('div')
                .style('margin-bottom', '20px');
            
            locationsDiv.append('h4')
                .style('color', '#333')
                .text('🗺️ 工作地点');
            
            const locationGrid = locationsDiv.append('div')
                .style('display', 'grid')
                .style('grid-template-columns', 'repeat(auto-fit, minmax(200px, 1fr))')
                .style('gap', '10px');
            
            locations.forEach(loc => {
                locationGrid.append('div')
                    .style('padding', '8px')
                    .style('background', '#f8f9fa')
                    .style('border', '1px solid #dee2e6')
                    .style('border-radius', '0')
                    .text(loc);
            });
        }
        
        // Career timeline
        const timelineDiv = reportContainer.append('div');
        timelineDiv.append('h4')
            .style('color', '#333')
            .text('📅 职业时间线');
        
        // Sort records by date or experience index
        const sortedRecords = records.slice().sort((a, b) => {
            // Try to sort by experience index first
            const indexA = parseInt(a[fields.experienceIndex]) || 0;
            const indexB = parseInt(b[fields.experienceIndex]) || 0;
            if (indexA !== indexB) return indexA - indexB;
            
            // Fallback to date sorting
            const dateA = parseDate(a[fields.startDate] || a[fields.date]);
            const dateB = parseDate(b[fields.startDate] || b[fields.date]);
            if (dateA && dateB) return dateA - dateB;
            return 0;
        });
        
        const timeline = timelineDiv.append('div')
            .style('max-height', '400px')
            .style('overflow-y', 'auto')
            .style('border', '1px solid #ddd')
            .style('padding', '10px');
        
        sortedRecords.forEach((record, index) => {
            const item = timeline.append('div')
                .style('padding', '12px')
                .style('margin', '8px 0')
                .style('border-left', '4px solid #3498db')
                .style('padding-left', '20px')
                .style('background', index % 2 === 0 ? '#ffffff' : '#f8f9fa')
                .style('border-radius', '0');
            
            const date = record[fields.startDate] || record[fields.date] || `记录${index + 1}`;
            const endDate = record[fields.endDate] || '';
            const position = record[fields.position] || '未知职位';
            const location = record[fields.location] || 
                           [record[fields.province], record[fields.city], record[fields.district]].filter(l => l).join('') || 
                           '未知地点';
            const rank = record[fields.rank] || extractRankFromPosition(position) || '';
            const experienceIndex = record[fields.experienceIndex] || (index + 1);
            
            // Header with date and sequence
            const header = item.append('div')
                .style('margin-bottom', '8px');
                
            header.append('strong')
                .style('color', '#2c3e50')
                .style('font-size', '14px')
                .text(`经历${experienceIndex}: ${date}${endDate ? ` - ${endDate}` : ''}`);
            
            // Position and rank
            const positionLine = item.append('div')
                .style('margin-bottom', '4px');
                
            positionLine.append('span')
                .style('font-weight', 'bold')
                .style('color', '#e74c3c')
                .text(position);
                
            if (rank) {
                positionLine.append('span')
                    .style('margin-left', '10px')
                    .style('background', '#3498db')
                    .style('color', 'white')
                    .style('padding', '2px 6px')
                    .style('font-size', '12px')
                    .style('border-radius', '0')
                    .text(rank);
            }
            
            // Location
            item.append('div')
                .style('color', '#7f8c8d')
                .style('font-size', '13px')
                .html(`📍 ${location}`);
        });
        
        // Add data quality summary
        const qualityDiv = reportContainer.append('div')
            .style('margin-top', '20px')
            .style('padding', '15px')
            .style('background', '#e3f2fd')
            .style('border', '1px solid #2196f3');
        
        qualityDiv.append('h4')
            .style('color', '#1976d2')
            .style('margin-bottom', '15px')
            .text('📈 数据质量分析');
        
        const hasDateField = fields.startDate || fields.date;
        const hasLocationField = fields.location || fields.province || fields.city;
        const hasPositionField = fields.position;
        const hasRankField = fields.rank;
        
        const qualityItems = [
            { label: '时间信息', status: hasDateField, count: records.filter(r => r[fields.startDate] || r[fields.date]).length },
            { label: '地点信息', status: hasLocationField, count: records.filter(r => r[fields.location] || r[fields.province] || r[fields.city]).length },
            { label: '职位信息', status: hasPositionField, count: records.filter(r => r[fields.position]).length },
            { label: '级别信息', status: hasRankField, count: records.filter(r => r[fields.rank]).length }
        ];
        
        const qualityGrid = qualityDiv.append('div')
            .style('display', 'grid')
            .style('grid-template-columns', 'repeat(auto-fit, minmax(200px, 1fr))')
            .style('gap', '10px');
        
        qualityItems.forEach(item => {
            const itemDiv = qualityGrid.append('div')
                .style('display', 'flex')
                .style('align-items', 'center')
                .style('gap', '8px');
            
            itemDiv.append('span')
                .style('font-size', '16px')
                .text(item.status ? '✅' : '❌');
                
            itemDiv.append('span')
                .text(`${item.label}: ${item.count}/${records.length}`);
        });
    }
    
    function extractRankFromPosition(position) {
        if (!position || typeof position !== 'string') return '';
        
        // Extract rank information from position title
        const rankPatterns = {
            '国家级': ['主席', '总理', '委员长', '国务委员', '副总理'],
            '省部级': ['省长', '部长', '省委书记', '省委副书记', '副省长', '副部长', '常务副', '省委常委'],
            '厅局级': ['厅长', '局长', '副厅长', '副局长', '司长', '副司长', '厅级'],
            '县处级': ['县长', '县委书记', '处长', '副处长', '县委副书记', '副县长', '处级'],
            '科级': ['科长', '副科长', '主任科员', '科员', '科级'],
            '股级': ['股长', '副股长', '股级']
        };
        
        for (const [rank, patterns] of Object.entries(rankPatterns)) {
            if (patterns.some(pattern => position.includes(pattern))) {
                return rank;
            }
        }
        
        // Try to extract common position indicators
        if (position.includes('正')) return '正职';
        if (position.includes('副')) return '副职';
        if (position.includes('助理')) return '助理级';
        if (position.includes('主任')) return '主任级';
        if (position.includes('书记')) return '书记级';
        if (position.includes('主席')) return '主席级';
        
        return ''; // Return empty if no pattern matches
    }
    
    function parseDate(dateStr) {
        if (!dateStr) return null;
        
        // Convert to string if it's a number
        const dateString = dateStr.toString().trim();
        
        // Check if it's an Excel serial number (typically 5-6 digits)
        if (/^\d{4,6}$/.test(dateString)) {
            const serialNumber = parseInt(dateString);
            // Excel serial date: days since January 1, 1900 (with leap year bug)
            if (serialNumber > 1 && serialNumber < 100000) {
                const excelEpoch = new Date(1900, 0, 1);
                // Account for Excel's leap year bug (1900 is not a leap year but Excel treats it as one)
                const adjustedDays = serialNumber > 59 ? serialNumber - 2 : serialNumber - 1;
                const resultDate = new Date(excelEpoch.getTime() + adjustedDays * 24 * 60 * 60 * 1000);
                console.log(`Converted Excel serial ${serialNumber} to date:`, resultDate.toISOString().split('T')[0]);
                return resultDate;
            }
        }
        
        // Try different date formats
        const formats = [
            /(\d{4})-(\d{1,2})-(\d{1,2})/,  // YYYY-MM-DD
            /(\d{4})\/(\d{1,2})\/(\d{1,2})/,  // YYYY/MM/DD
            /(\d{4})年(\d{1,2})月(\d{1,2})日/,  // YYYY年MM月DD日
            /(\d{4})-(\d{1,2})/,  // YYYY-MM
            /(\d{4})年(\d{1,2})月/,  // YYYY年MM月
            /(\d{4})/  // YYYY
        ];
        
        for (const format of formats) {
            const match = dateString.match(format);
            if (match) {
                const year = parseInt(match[1]);
                const month = match[2] ? parseInt(match[2]) - 1 : 0; // JS months are 0-indexed
                const day = match[3] ? parseInt(match[3]) : 1;
                return new Date(year, month, day);
            }
        }
        
        // Try direct parsing
        const parsed = new Date(dateString);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    
    function loadCPEDData() {
        console.log('Loading CPED.xlsx data...');
        
        // Load CPED.xlsx data if no data is available
        fetch('../assets/data/CPED.xlsx')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch CPED.xlsx');
                }
                return response.arrayBuffer();
            })
            .then(buffer => {
                try {
                    // Parse Excel data using XLSX library
                    const workbook = XLSX.read(buffer, {type: 'array'});
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Convert to JSON
                    const cpedXlsxData = XLSX.utils.sheet_to_json(worksheet);
                    cpedData = cpedXlsxData;
                    localStorage.setItem('cpedData', JSON.stringify(cpedXlsxData));
                    console.log('CPED.xlsx data loaded successfully:', cpedXlsxData.length, 'records');
                    
                    // Show first few records to understand structure
                    if (cpedXlsxData.length > 0) {
                        console.log('Sample record fields:', Object.keys(cpedXlsxData[0]));
                        console.log('First record:', cpedXlsxData[0]);
                    }
                    
                    // Show data loaded notification
                    $('#visualizationArea').prepend(`
                        <div class="alert alert-success" style="border: 2px solid #27ae60; border-radius: 0; margin-bottom: 20px;">
                            <i class="fa fa-check-circle"></i> 
                            <strong>CPED数据已加载</strong> - 包含 ${cpedXlsxData.length} 条记录。请输入官员姓名开始分析。
                            <button type="button" class="close" style="color: #27ae60;" onclick="$(this).parent().remove()">×</button>
                        </div>
                    `);
                } catch (error) {
                    console.error('Error parsing CPED.xlsx:', error);
                    // Fallback to CSV sample data
                    loadCsvSampleData();
                }
            })
            .catch(error => {
                console.error('Failed to load CPED.xlsx:', error);
                // Fallback to CSV sample data
                loadCsvSampleData();
            });
    }
    
    function loadCsvSampleData() {
        console.log('Loading CSV sample data as fallback...');
        
        // Fallback: Load CSV sample data
        $.get('../assets/data/sample_cped.csv', function(data) {
            const sampleData = $.csv.toObjects(data);
            cpedData = sampleData;
            localStorage.setItem('cpedData', JSON.stringify(sampleData));
            console.log('Sample CSV data loaded:', sampleData.length, 'records');
            
            // Show sample data notification
            $('#visualizationArea').prepend(`
                <div class="alert alert-info" style="border: 2px solid #3498db; border-radius: 0; margin-bottom: 20px;">
                    <i class="fa fa-info-circle"></i> 
                    <strong>示例数据已加载</strong> - 包含 ${sampleData.length} 条记录。您可以搜索"习近平"、"李克强"等官员姓名进行测试。
                    <button type="button" class="close" style="color: #3498db;" onclick="$(this).parent().remove()">×</button>
                </div>
            `);
        }).fail(function() {
            console.error('Failed to load sample data');
            $('#visualizationArea').html(`
                <div class="alert alert-danger" style="border: 2px solid #e74c3c; border-radius: 0;">
                    <i class="fa fa-exclamation-triangle"></i> 
                    <strong>数据加载失败</strong> - 请检查网络连接或联系管理员。
                </div>
            `);
        });
    }
    
    function showDataPreview(data) {
        console.log('Showing data preview for', data.length, 'records');
        
        // Clear visualization area and show preview
        $('#visualizationArea').html('');
        
        const previewContainer = d3.select('#visualizationArea')
            .append('div')
            .style('padding', '20px');
        
        previewContainer.append('h3')
            .text('数据预览');
        
        // Show basic statistics
        const statsDiv = previewContainer.append('div')
            .style('margin-bottom', '20px')
            .style('padding', '15px')
            .style('background', '#f8f9fa')
            .style('border-radius', '5px');
        
        statsDiv.append('h4').text('数据统计');
        statsDiv.append('p').html(`<strong>总记录数:</strong> ${data.length}`);
        
        if (data.length > 0) {
            const fields = Object.keys(data[0]);
            statsDiv.append('p').html(`<strong>字段数量:</strong> ${fields.length}`);
            
            // Show all fields
            const fieldsDiv = statsDiv.append('div');
            fieldsDiv.append('h5').text('所有字段:');
            const fieldsList = fieldsDiv.append('ul').style('columns', '3').style('column-gap', '20px');
            fields.forEach(field => {
                fieldsList.append('li').text(field);
            });
            
            // Try to identify name-like fields and show sample names
            const possibleNameFields = fields.filter(field => 
                field.toLowerCase().includes('name') || 
                field.includes('姓名') || 
                field.toLowerCase().includes('person') ||
                (typeof data[0][field] === 'string' && 
                 data[0][field].length >= 2 && 
                 data[0][field].length <= 10)
            );
            
            if (possibleNameFields.length > 0) {
                const namesDiv = previewContainer.append('div')
                    .style('margin-bottom', '20px')
                    .style('padding', '15px')
                    .style('background', '#e8f5e8')
                    .style('border-radius', '5px');
                
                namesDiv.append('h4').text('可能的姓名字段');
                
                possibleNameFields.forEach(field => {
                    const uniqueNames = [...new Set(data.map(record => record[field]).filter(val => val && typeof val === 'string'))];
                    if (uniqueNames.length > 0) {
                        const fieldDiv = namesDiv.append('div').style('margin-bottom', '10px');
                        fieldDiv.append('h5').text(`${field} (${uniqueNames.length} 个不同值):`);
                        
                        const sampleNames = uniqueNames.slice(0, 20); // Show first 20 names
                        fieldDiv.append('p')
                            .style('font-size', '14px')
                            .text(sampleNames.join(', ') + (uniqueNames.length > 20 ? '...' : ''));
                    }
                });
            }
        }
        
        // Show sample records
        const sampleDiv = previewContainer.append('div')
            .style('margin-bottom', '20px');
        
        sampleDiv.append('h4').text('样本记录 (前5条)');
        
        const table = sampleDiv.append('table')
            .style('width', '100%')
            .style('border-collapse', 'collapse')
            .style('border', '1px solid #ddd');
        
        if (data.length > 0) {
            const fields = Object.keys(data[0]);
            
            // Table header
            const header = table.append('thead').append('tr');
            fields.forEach(field => {
                header.append('th')
                    .style('border', '1px solid #ddd')
                    .style('padding', '8px')
                    .style('background', '#f8f9fa')
                    .text(field);
            });
            
            // Table body
            const tbody = table.append('tbody');
            data.slice(0, 5).forEach(record => {
                const row = tbody.append('tr');
                fields.forEach(field => {
                    row.append('td')
                        .style('border', '1px solid #ddd')
                        .style('padding', '8px')
                        .style('max-width', '200px')
                        .style('overflow', 'hidden')
                        .style('text-overflow', 'ellipsis')
                        .text(record[field] || '');
                });
            });
        }
        
        // Add close button
        previewContainer.append('button')
            .attr('class', 'btn btn-secondary')
            .style('margin-top', '20px')
            .text('关闭预览')
            .on('click', function() {
                $('#visualizationArea').html(`
                    <div style="text-align: center; padding: 50px; color: #666;">
                        <i class="fa fa-info-circle" style="font-size: 48px; margin-bottom: 20px;"></i>
                        <p style="font-size: 18px; font-family: 'retro1', sans-serif;">请在左侧输入官员姓名并选择可视化类型开始分析</p>
                    </div>
                `);
            });
    }
});