// Function to process and optimize large datasets
function processLargeDataset(rawData, fileName) {
    const maxRecords = 50000; // Maximum records to process
    const maxStorageSize = 4 * 1024 * 1024; // 4MB limit for localStorage
    
    console.log('Processing dataset:', rawData.length, 'records');
    
    // Check if user specified a target official for pre-filtering
    const targetOfficial = $('#targetOfficial').val().trim();
    if (targetOfficial) {
        console.log('Pre-filtering data for official:', targetOfficial);
        const filteredData = filterDataForOfficial(rawData, targetOfficial);
        
        if (filteredData.length > 0) {
            console.log('Pre-filtering completed:', filteredData.length, 'records found for', targetOfficial);
            alert(`成功为官员"${targetOfficial}"筛选出 ${filteredData.length} 条相关记录！\n原数据：${rawData.length.toLocaleString()} 条\n筛选后：${filteredData.length} 条`);
            return filteredData;
        } else {
            const tryFuzzy = confirm(
                `未找到官员"${targetOfficial}"的精确记录。\n\n` +
                `选择处理方式：\n` +
                `• 确定：进行模糊搜索（包含该姓名的记录）\n` +
                `• 取消：加载全部数据进行手动搜索`
            );
            
            if (tryFuzzy) {
                const fuzzyResults = fuzzyFilterDataForOfficial(rawData, targetOfficial);
                if (fuzzyResults.length > 0) {
                    console.log('Fuzzy search found:', fuzzyResults.length, 'records');
                    alert(`模糊搜索找到 ${fuzzyResults.length} 条可能相关的记录！`);
                    return fuzzyResults;
                } else {
                    alert('模糊搜索也未找到相关记录，将加载全部数据。');
                }
            } else {
                alert('将加载全部数据，您可以在分析页面手动搜索。');
            }
        }
    }
    
    // Check if dataset is too large
    if (rawData.length > maxRecords) {
        const shouldSample = confirm(
            `数据集包含 ${rawData.length.toLocaleString()} 条记录，可能影响性能。\n\n` +
            `建议选项：\n` +
            `1. 点击"确定"进行数据抽样（随机选择 ${maxRecords.toLocaleString()} 条记录）\n` +
            `2. 点击"取消"使用全部数据（可能很慢）\n\n` +
            `推荐选择数据抽样以获得更好的性能。`
        );
        
        if (shouldSample) {
            // Random sampling
            const sampledData = [];
            const step = Math.floor(rawData.length / maxRecords);
            for (let i = 0; i < rawData.length; i += step) {
                if (sampledData.length < maxRecords) {
                    sampledData.push(rawData[i]);
                }
            }
            console.log('Data sampled from', rawData.length, 'to', sampledData.length, 'records');
            alert(`数据抽样完成！从 ${rawData.length.toLocaleString()} 条记录中选择了 ${sampledData.length.toLocaleString()} 条记录。`);
            return sampledData;
        } else {
            console.log('User chose to keep full dataset');
            alert(`保留全部 ${rawData.length.toLocaleString()} 条记录。注意：处理可能较慢。`);
        }
    }
    
    // Check estimated storage size
    try {
        const testJson = JSON.stringify(rawData.length > 1000 ? rawData.slice(0, 1000) : rawData);
        const estimatedSize = (testJson.length * rawData.length) / (rawData.length > 1000 ? 1000 : rawData.length);
        
        console.log('Estimated storage size:', (estimatedSize / 1024 / 1024).toFixed(2), 'MB');
        
        if (estimatedSize > maxStorageSize) {
            const shouldCompress = confirm(
                `数据序列化后预计大小: ${(estimatedSize / 1024 / 1024).toFixed(2)} MB\n` +
                `超过浏览器存储限制 (${maxStorageSize / 1024 / 1024} MB)\n\n` +
                `是否进行数据压缩处理？\n` +
                `- 确定：移除空字段和优化数据结构\n` +
                `- 取消：尝试直接存储（可能失败）`
            );
            
            if (shouldCompress) {
                return compressDataset(rawData);
            }
        }
    } catch (e) {
        console.warn('Could not estimate storage size:', e);
    }
    
    alert(`成功加载 ${rawData.length.toLocaleString()} 条记录！`);
    return rawData;
}

// Function to filter data for a specific official (exact match)
function filterDataForOfficial(data, officialName) {
    if (!data || data.length === 0 || !officialName) {
        return [];
    }
    
    console.log('Filtering data for official:', officialName);
    
    // Find potential name fields
    const sampleRecord = data[0];
    const possibleNameFields = Object.keys(sampleRecord).filter(key => 
        key.toLowerCase().includes('name') || 
        key.includes('姓名') || 
        key.includes('名字') ||
        key.toLowerCase().includes('官员')
    );
    
    console.log('Possible name fields found:', possibleNameFields);
    
    // If no obvious name fields, check all fields
    if (possibleNameFields.length === 0) {
        possibleNameFields.push(...Object.keys(sampleRecord));
    }
    
    const filteredData = data.filter(record => {
        return possibleNameFields.some(field => {
            const fieldValue = record[field];
            if (fieldValue && typeof fieldValue === 'string') {
                return fieldValue.trim() === officialName.trim();
            }
            return false;
        });
    });
    
    console.log('Exact match filtering result:', filteredData.length, 'records');
    return filteredData;
}

// Function to filter data for a specific official (fuzzy match)
function fuzzyFilterDataForOfficial(data, officialName) {
    if (!data || data.length === 0 || !officialName) {
        return [];
    }
    
    console.log('Fuzzy filtering data for official:', officialName);
    
    // Find potential name fields
    const sampleRecord = data[0];
    const possibleNameFields = Object.keys(sampleRecord).filter(key => 
        key.toLowerCase().includes('name') || 
        key.includes('姓名') || 
        key.includes('名字') ||
        key.toLowerCase().includes('官员')
    );
    
    // If no obvious name fields, check all string fields
    if (possibleNameFields.length === 0) {
        possibleNameFields.push(...Object.keys(sampleRecord).filter(key => {
            const value = sampleRecord[key];
            return value && typeof value === 'string' && value.length >= 2 && value.length <= 20;
        }));
    }
    
    console.log('Using fields for fuzzy search:', possibleNameFields);
    
    const filteredData = data.filter(record => {
        return possibleNameFields.some(field => {
            const fieldValue = record[field];
            if (fieldValue && typeof fieldValue === 'string') {
                const cleanField = fieldValue.trim().toLowerCase();
                const cleanTarget = officialName.trim().toLowerCase();
                
                // Check if field contains the target name or vice versa
                return cleanField.includes(cleanTarget) || cleanTarget.includes(cleanField);
            }
            return false;
        });
    });
    
    console.log('Fuzzy match filtering result:', filteredData.length, 'records');
    return filteredData;
}

// Function to show data overview
function showDataOverview(data) {
    if (!data || data.length === 0) return;
    
    try {
        console.log('Generating data overview...');
        
        // Basic statistics
        const totalRecords = data.length;
        const fields = Object.keys(data[0]);
        
        // Try to identify name field and count unique officials
        const nameFields = fields.filter(field => 
            field.toLowerCase().includes('name') || 
            field.includes('姓名') || 
            field.includes('名字') ||
            field.toLowerCase().includes('官员')
        );
        
        let uniqueOfficials = new Set();
        let sampleNames = [];
        
        if (nameFields.length > 0) {
            const primaryNameField = nameFields[0];
            data.forEach(record => {
                const name = record[primaryNameField];
                if (name && typeof name === 'string' && name.trim()) {
                    uniqueOfficials.add(name.trim());
                    if (sampleNames.length < 5) {
                        sampleNames.push(name.trim());
                    }
                }
            });
        }
        
        // Generate overview HTML
        let overviewHTML = `
            <div style="background: #e8f5e8; border: 2px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 0;">
                <h5 style="color: #28a745; margin-bottom: 15px; font-family: 'retro', sans-serif;">
                    <i class="fa fa-chart-bar"></i> 数据概览
                </h5>
                <div class="row">
                    <div class="col-md-6">
                        <strong>📊 基本统计</strong>
                        <ul style="margin: 10px 0 0 20px; font-size: 14px;">
                            <li>总记录数：${totalRecords.toLocaleString()} 条</li>
                            <li>数据字段：${fields.length} 个</li>
                            ${uniqueOfficials.size > 0 ? `<li>不重复官员：${uniqueOfficials.size} 人</li>` : ''}
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <strong>📋 数据字段</strong>
                        <div style="margin: 10px 0; font-size: 12px; max-height: 100px; overflow-y: auto;">
                            ${fields.map(field => `<span style="display: inline-block; background: #fff; border: 1px solid #28a745; padding: 2px 6px; margin: 2px; border-radius: 0;">${field}</span>`).join('')}
                        </div>
                    </div>
                </div>
                ${sampleNames.length > 0 ? `
                <div style="margin-top: 15px;">
                    <strong>👥 示例官员姓名</strong>
                    <div style="margin: 5px 0; font-size: 13px;">
                        ${sampleNames.map(name => `<code style="background: #fff; padding: 2px 4px; margin: 2px; border: 1px solid #28a745;">${name}</code>`).join(' ')}
                    </div>
                </div>
                ` : ''}
                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #28a745; font-size: 13px; color: #666;">
                    💡 <strong>提示：</strong>现在可以在上方输入官员姓名进行预过滤，或直接点击"预览数据"查看详细内容
                </div>
            </div>
        `;
        
        // Insert overview before the data preview section
        const $listContainer = $('#list').parent();
        $listContainer.find('.data-overview').remove(); // Remove existing overview
        $listContainer.prepend(`<div class="data-overview">${overviewHTML}</div>`);
        
        console.log('Data overview generated successfully');
        
    } catch (error) {
        console.error('Error generating data overview:', error);
    }
}

// Function to compress dataset by removing empty fields and optimizing structure
function compressDataset(data) {
    console.log('Compressing dataset...');
    
    if (data.length === 0) return data;
    
    // Analyze which fields are mostly empty
    const fieldStats = {};
    const sampleSize = Math.min(1000, data.length);
    
    for (let i = 0; i < sampleSize; i++) {
        const record = data[i];
        Object.keys(record).forEach(key => {
            if (!fieldStats[key]) {
                fieldStats[key] = { empty: 0, total: 0 };
            }
            fieldStats[key].total++;
            if (!record[key] || record[key].toString().trim() === '') {
                fieldStats[key].empty++;
            }
        });
    }
    
    // Identify fields to keep (less than 80% empty)
    const fieldsToKeep = Object.keys(fieldStats).filter(field => {
        const emptyRatio = fieldStats[field].empty / fieldStats[field].total;
        return emptyRatio < 0.8;
    });
    
    console.log('Keeping fields:', fieldsToKeep);
    console.log('Removing fields with >80% empty values:', 
        Object.keys(fieldStats).filter(f => !fieldsToKeep.includes(f)));
    
    // Create compressed dataset
    const compressedData = data.map(record => {
        const compressed = {};
        fieldsToKeep.forEach(field => {
            if (record[field] && record[field].toString().trim() !== '') {
                compressed[field] = record[field];
            }
        });
        return compressed;
    });
    
    const originalSize = JSON.stringify(data.slice(0, 100)).length;
    const compressedSize = JSON.stringify(compressedData.slice(0, 100)).length;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    console.log(`Compression completed. Estimated size reduction: ${compressionRatio}%`);
    alert(`数据压缩完成！\n` +
          `保留字段: ${fieldsToKeep.length}\n` +
          `预计大小减少: ${compressionRatio}%\n` +
          `处理记录: ${compressedData.length.toLocaleString()} 条`);
    
    return compressedData;
}

$(document).ready(function() {
    let data;  // Store the CSV data globally
    
    console.log('CPED JavaScript loaded successfully');
    
    // Handle file upload and preview
    $('#csvfile').change(function(evt) {
        console.log('File input changed');
        let file = evt.target.files[0];
        
        if (file) {
            console.log('File selected:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
            
            // Check file size (warn if > 2MB, block if > 10MB)
            const fileSizeMB = file.size / 1024 / 1024;
            if (fileSizeMB > 10) {
                alert(`文件太大 (${fileSizeMB.toFixed(2)} MB)！请使用小于10MB的文件，或考虑数据抽样。建议文件大小不超过2MB以获得最佳性能。`);
                $(this).val(''); // Clear the file input
                return;
            } else if (fileSizeMB > 2) {
                const proceed = confirm(`文件较大 (${fileSizeMB.toFixed(2)} MB)，可能影响性能。是否继续？\n\n建议：\n- 使用数据抽样减少记录数量\n- 删除不必要的列\n- 使用小于2MB的文件`);
                if (!proceed) {
                    $(this).val(''); // Clear the file input
                    return;
                }
            }
            
            let reader = new FileReader();
            
            if (file.name.endsWith('.csv')) {
                reader.readAsText(file);
                reader.onload = function(event) {
                    try {
                        // Parse CSV data
                        let rawData = $.csv.toObjects(event.target.result);
                        console.log('Raw CSV data loaded:', rawData.length, 'records');
                        
                        // Process and potentially sample the data
                        data = processLargeDataset(rawData, file.name);
                        
                        // Show data overview
                        if (data && data.length > 0) {
                            showDataOverview(data);
                        }
                        
                    } catch (error) {
                        console.error('Error parsing CSV:', error);
                        alert('解析CSV文件时出错，请检查文件格式');
                    }
                };
                reader.onerror = function() {
                    console.error('Error reading file');
                    alert('读取文件时出错');
                };
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                reader.readAsArrayBuffer(file);
                reader.onload = function(event) {
                    try {
                        // Parse Excel data
                        let workbook = XLSX.read(event.target.result, {type: 'array'});
                        let firstSheetName = workbook.SheetNames[0];
                        let worksheet = workbook.Sheets[firstSheetName];
                        
                        // Convert to JSON
                        let rawData = XLSX.utils.sheet_to_json(worksheet);
                        console.log('Raw Excel data loaded:', rawData.length, 'records');
                        
                        // Process and potentially sample the data
                        data = processLargeDataset(rawData, file.name);
                        
                        // Show data overview
                        if (data && data.length > 0) {
                            showDataOverview(data);
                        }
                    } catch (error) {
                        console.error('Error parsing Excel file:', error);
                        alert('解析Excel文件时出错，请检查文件格式');
                    }
                };
                reader.onerror = function() {
                    console.error('Error reading file');
                    alert('读取文件时出错');
                };
            } else {
                alert('不支持的文件格式，请上传CSV或Excel文件');
                return;
            }
        }
    });
    
    // Handle view file button click
    $('#viewfile').click(function(e) {
        e.preventDefault();
        console.log('View file button clicked');
        
        if (!data) {
            alert('请先上传数据文件！');
            return;
        }
        
        try {
            let previewData = data;
            let previewTitle = '数据预览';
            
            // Check if user wants to preview filtered data
            const targetOfficial = $('#targetOfficial').val().trim();
            if (targetOfficial) {
                const filteredData = filterDataForOfficial(data, targetOfficial);
                if (filteredData.length > 0) {
                    previewData = filteredData;
                    previewTitle = `官员"${targetOfficial}"的筛选结果预览`;
                } else {
                    // Try fuzzy search for preview
                    const fuzzyData = fuzzyFilterDataForOfficial(data, targetOfficial);
                    if (fuzzyData.length > 0) {
                        previewData = fuzzyData;
                        previewTitle = `官员"${targetOfficial}"的模糊搜索结果预览`;
                    }
                }
            }
            
            // Create preview table
            let columns = Object.keys(previewData[0]);
            let displayData = previewData.slice(0, 20); // Show more rows for filtered data
            
            let tableHTML = `<h5 style="color: #333; margin-bottom: 15px;">${previewTitle}</h5>`;
            tableHTML += '<div style="max-height: 400px; overflow-y: auto;"><table class="table table-bordered table-striped table-sm">';
            
            // Add header row
            tableHTML += '<thead class="thead-dark"><tr>';
            columns.forEach(column => {
                tableHTML += `<th scope="col">${column}</th>`;
            });
            tableHTML += '</tr></thead>';
            
            // Add data rows
            tableHTML += '<tbody>';
            displayData.forEach(row => {
                tableHTML += '<tr>';
                columns.forEach(column => {
                    let cellValue = row[column] || '';
                    // Highlight the target official name if filtering
                    if (targetOfficial && typeof cellValue === 'string' && 
                        (cellValue.includes(targetOfficial) || targetOfficial.includes(cellValue))) {
                        cellValue = `<mark style="background: #fff3cd; padding: 2px;">${cellValue}</mark>`;
                    }
                    tableHTML += `<td>${cellValue}</td>`;
                });
                tableHTML += '</tr>';
            });
            tableHTML += '</tbody></table></div>';
            
            if (targetOfficial) {
                if (previewData.length > 0) {
                    tableHTML += `<p class="mt-2 text-success">✅ 找到 ${previewData.length} 条相关记录（显示前20条）</p>`;
                } else {
                    tableHTML += `<p class="mt-2 text-warning">⚠️ 未找到官员"${targetOfficial}"的记录</p>`;
                }
            }
            
            tableHTML += `<p class="mt-2 text-muted">原始数据：${data.length} 条记录 | 当前显示：${Math.min(displayData.length, 20)} 条</p>`;
            
            $('#list').html(tableHTML);
        } catch (error) {
            console.error('Error creating preview:', error);
            alert('预览数据时出错');
        }
    });
    
    // Handle draw graph button click
    $('#drawgraph').click(function(e) {
        e.preventDefault();
        console.log('Draw graph button clicked');
        
        try {
            if (!data) {
                console.log('No data uploaded, redirecting to use default CPED data');
                // No uploaded data, just redirect to use default CPED data
                try {
                    localStorage.removeItem('cpedData');
                    console.log('Successfully cleared localStorage');
                } catch (storageError) {
                    console.warn('Failed to clear localStorage:', storageError);
                    // Continue anyway, this is not critical
                }
                
                try {
                    console.log('Attempting navigation to CPEDvis.html...');
                    window.location.href = 'CPEDvis.html';
                    return;
                } catch (navError) {
                    console.error('Navigation error:', navError);
                    alert('页面跳转失败，请手动点击导航栏中的"开始分析"按钮');
                    return;
                }
            }
            
            // Store data in localStorage for use in the next page
            console.log('Preparing to store data in localStorage:', data.length, 'records');
            
                         try {
                 const jsonData = JSON.stringify(data);
                 const dataSizeMB = (jsonData.length / 1024 / 1024).toFixed(2);
                 console.log('Data serialized successfully, size:', dataSizeMB, 'MB');
                 
                 // Check if localStorage is available
                 if (typeof(Storage) === "undefined") {
                     throw new Error('浏览器不支持localStorage');
                 }
                 
                 // Warn if data is large
                 if (jsonData.length > 3 * 1024 * 1024) { // 3MB
                     const proceed = confirm(
                         `序列化后的数据大小: ${dataSizeMB} MB\n` +
                         `较大的数据可能导致存储失败或性能问题。\n\n` +
                         `是否继续？如果失败，系统会自动尝试数据压缩。`
                     );
                     if (!proceed) {
                         return;
                     }
                 }
                 
                 // Try to store data
                 try {
                     localStorage.setItem('cpedData', jsonData);
                     console.log('Data stored in localStorage successfully');
                 } catch (quotaError) {
                     console.error('localStorage quota exceeded:', quotaError);
                     
                     // Offer compression as solution
                     const tryCompress = confirm(
                         `存储失败，数据太大 (${dataSizeMB} MB)。\n\n` +
                         `解决方案:\n` +
                         `1. 点击"确定"进行数据压缩后重试\n` +
                         `2. 点击"取消"放弃上传，使用默认数据\n\n` +
                         `推荐选择数据压缩。`
                     );
                     
                     if (tryCompress) {
                         console.log('Attempting data compression...');
                         const compressedData = compressDataset(data);
                         const compressedJson = JSON.stringify(compressedData);
                         const compressedSizeMB = (compressedJson.length / 1024 / 1024).toFixed(2);
                         
                         console.log('Compressed data size:', compressedSizeMB, 'MB');
                         
                         try {
                             // Clear localStorage first
                             localStorage.clear();
                             localStorage.setItem('cpedData', compressedJson);
                             console.log('Compressed data stored successfully');
                             data = compressedData; // Update the data variable
                         } catch (compressedError) {
                             console.error('Even compressed data failed to store:', compressedError);
                             throw new Error(`即使压缩后仍无法存储 (${compressedSizeMB} MB)。请使用更小的数据文件或更少的记录。`);
                         }
                     } else {
                         throw new Error('用户取消了数据压缩，将使用默认数据。');
                     }
                 }
                 
             } catch (dataError) {
                 console.error('Data processing error:', dataError);
                 if (dataError.message.includes('用户取消')) {
                     // User cancelled, redirect to use default data
                     localStorage.removeItem('cpedData');
                     alert('已取消上传，将使用默认CPED数据进行分析。');
                     try {
                         window.location.href = 'CPEDvis.html';
                     } catch (navError) {
                         alert('请手动点击"开始分析"按钮使用默认数据。');
                     }
                 } else {
                     alert('数据处理失败：' + dataError.message);
                 }
                 return;
             }
            
            // Redirect to visualization page
            try {
                console.log('Attempting navigation to CPEDvis.html...');
                window.location.href = 'CPEDvis.html';
            } catch (navError) {
                console.error('Navigation error:', navError);
                alert('数据已保存，但页面跳转失败。请手动点击导航栏中的"开始分析"按钮');
            }
            
        } catch (error) {
            console.error('Error in draw graph function:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            alert('处理过程中出现错误：' + error.message + '。请重试或联系技术支持。');
        }
    });
    
    // Handle use default CPED data button click
    $('#usedefault').click(function(e) {
        e.preventDefault();
        console.log('Use default button clicked');
        
        try {
            // Clear any existing data and let the visualization page load default CPED.xlsx
            try {
                localStorage.removeItem('cpedData');
                console.log('Successfully cleared localStorage for default data');
            } catch (storageError) {
                console.warn('Failed to clear localStorage:', storageError);
                // Continue anyway, this is not critical
            }
            
            // Redirect to visualization page
            try {
                console.log('Attempting navigation to CPEDvis.html with default data...');
                window.location.href = 'CPEDvis.html';
            } catch (navError) {
                console.error('Navigation error:', navError);
                alert('页面跳转失败，请手动点击导航栏中的"开始分析"按钮');
            }
            
        } catch (error) {
            console.error('Error in use default function:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            alert('处理过程中出现错误：' + error.message + '。请重试或联系技术支持。');
        }
    });
    
    // Handle real-time official name input feedback
    $('#targetOfficial').on('input', function() {
        const officialName = $(this).val().trim();
        const $feedback = $('#officialFeedback');
        
        if (!data || !officialName) {
            $feedback.html('').hide();
            return;
        }
        
        if (officialName.length >= 2) {
            // Quick search to provide feedback
            const exactMatches = filterDataForOfficial(data, officialName);
            const fuzzyMatches = fuzzyFilterDataForOfficial(data, officialName);
            
            let feedbackHTML = '';
            if (exactMatches.length > 0) {
                feedbackHTML = `<span style="color: #28a745;">✅ 精确匹配：${exactMatches.length} 条记录</span>`;
            } else if (fuzzyMatches.length > 0) {
                feedbackHTML = `<span style="color: #ffc107;">🔍 模糊匹配：${fuzzyMatches.length} 条记录</span>`;
            } else {
                feedbackHTML = `<span style="color: #dc3545;">❌ 未找到匹配记录</span>`;
            }
            
            $feedback.html(feedbackHTML).show();
        } else {
            $feedback.html('').hide();
        }
    });
    
    // Debug: Log when buttons are found
    console.log('Buttons found:');
    console.log('csvfile:', $('#csvfile').length);
    console.log('viewfile:', $('#viewfile').length);
    console.log('drawgraph:', $('#drawgraph').length);
    console.log('usedefault:', $('#usedefault').length);
    console.log('targetOfficial:', $('#targetOfficial').length);
    
    // Environment checks
    console.log('Environment status:');
    console.log('jQuery version:', $.fn.jquery);
    console.log('localStorage available:', typeof(Storage) !== "undefined");
    console.log('XLSX library available:', typeof(XLSX) !== "undefined");
    console.log('CSV parser available:', typeof($.csv) !== "undefined");
    console.log('Current protocol:', window.location.protocol);
    console.log('Current hostname:', window.location.hostname);
    console.log('Current pathname:', window.location.pathname);
    
    // Test basic functionality
    try {
        localStorage.setItem('test_key', 'test_value');
        const testValue = localStorage.getItem('test_key');
        localStorage.removeItem('test_key');
        console.log('localStorage test: PASSED');
    } catch (e) {
        console.error('localStorage test: FAILED -', e);
    }
    
    // Check if we're running on file:// protocol which can cause issues
    if (window.location.protocol === 'file:') {
        console.warn('Warning: Running on file:// protocol, which may cause localStorage issues');
    }
});