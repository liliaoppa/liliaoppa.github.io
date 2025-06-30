let data;  // Define data in the global scope
let columns;  // Define columns in the global scope

$(document).ready(function() {
    $('#dataFile').change(function(evt) {
        let file = evt.target.files[0];
        
        if (!file) return;
        
        // 显示加载状态
        showLoading('正在加载数据文件...');
        
        // 检查文件类型
        const fileName = file.name.toLowerCase();
        
        if (fileName.endsWith('.csv')) {
            // 加载 CSV 文件
            d3.csv(URL.createObjectURL(file)).then(function(loadedData) {
                processLoadedData(loadedData);
            }).catch(function(error) {
                showError('加载 CSV 文件失败: ' + error.message);
            });
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            // 加载 Excel 文件
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const workbook = XLSX.read(e.target.result, {type: 'array'});
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    
                    // 转换为 D3 格式
                    if (jsonData.length > 0) {
                        const columns = Object.keys(jsonData[0]);
                        const d3Data = jsonData;
                        d3Data.columns = columns;
                        processLoadedData(d3Data);
                    } else {
                        showError('文件为空或格式不正确');
                    }
                } catch (error) {
                    showError('加载 Excel 文件失败: ' + error.message);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            showError('不支持的文件格式，请上传 CSV 或 Excel 文件');
        }
    });
    
    function processLoadedData(loadedData) {
        data = loadedData;
        columns = data.columns || Object.keys(data[0]);
        
        console.log('数据加载成功:', data.length, '条记录');
        console.log('可用列:', columns);
        
        populateVariablesList(columns);
        
        // Enable options and draw button
        $('#plotOptions, #draw').prop('disabled', false);
        
        // Trigger the change event to set the initial state
        $('#plotOptions').trigger('change');
        
        showSuccess('数据加载成功！共 ' + data.length + ' 条记录，' + columns.length + ' 个变量');
    }
    
    function showLoading(message) {
        $('#content').html(`
            <div style="text-align: center; padding: 50px; color: #666;">
                <div class="loading"></div>
                <p style="font-size: 18px; font-family: 'retro1', sans-serif;">${message}</p>
            </div>
        `);
    }
    
    function showSuccess(message) {
        $('#content').prepend(`
            <div class="alert alert-success">
                <i class="fa fa-check-circle"></i> ${message}
                <button type="button" class="close" style="float: right; background: none; border: none; font-size: 20px;" onclick="$(this).parent().remove()">&times;</button>
            </div>
        `);
    }
    
    function showError(message) {
        $('#content').html(`
            <div class="alert alert-error">
                <i class="fa fa-exclamation-triangle"></i> ${message}
            </div>
            <div style="text-align: center; padding: 30px; color: #666;">
                <i class="fa fa-info-circle" style="font-size: 48px; margin-bottom: 20px;"></i>
                <p style="font-size: 18px; font-family: 'retro1', sans-serif;">
                    请上传数据文件并配置变量，然后点击“开始绘图”按钮
                </p>
            </div>
        `);
    }

    function populateVariablesList(columns) {
        if (!columns) {
            console.log('Columns is undefined');
            return;
        }
    
        let list = $('#variables');
        list.empty();  // Clear the list
        columns.forEach(column => {
            let item = $('<li></li>').text(column).addClass('list-group-item draggable').attr('draggable', 'true');
            list.append(item);
        });
    }

    // Enable drag and drop between all uls
    $('ul.sortable').sortable({
        items: 'li:not(.placeholder)',
        connectWith: 'ul.sortable',
        helper: 'clone',
        start: function (event, ui) {
            ui.item.show();
        },
        receive: function (event, ui) {
            if (ui.helper) {
                $(this).append(ui.helper.clone());
                // If the item was dragged out of #iv, remove its color classes
                if (ui.sender.attr('id') === 'iv') {
                    ui.item.removeClass('treatment control');
                }
            }
        },
        over: function (event, ui) {
            // Hide placeholder
            $(this).find('.placeholder').hide();
        },
        out: function (event, ui) {
            // Show placeholder if list is empty
            if ($(this).children('li:not(.placeholder)').length === 0) {
                $(this).find('.placeholder').show();
            }
        }
    }).disableSelection();

    // Handle double click
    $(document).on('dblclick', 'li:not(.placeholder)', function() {
        let item = $(this).clone().removeClass('treatment control');
        $('#variables').append(item);
        $(this).remove();
        // Show placeholder if list is empty
        ['dv', 'iv', 'ind', 'missing'].forEach(id => {
            if ($(`#${id}`).children('li:not(.placeholder)').length === 0) {
                $(`#${id}`).find('.placeholder').show();
            }
        });
    });


    // Handle click for treatment
    $(document).on('click', '#iv li:not(.placeholder)', function() {
        // Remove 'treat' id from any list item that has it
        $('#treatgroup').removeAttr('id');
    
        // Add 'control' class to all list items
        $('#iv li').addClass('control');
    
        // Remove 'control' class and add 'treat' id to the clicked list item
        $(this).removeClass('control').attr('id', 'treatgroup');
    });

    $('#plotOptions').change(function() {
        let option = $(this).val();
        if (option === 'missing') {
            $('#dvGroup, #ivGroup').hide();
            $('#indGroup, #missingGroup').show();
        } else if (option === 'treatment') {
            $('#dvGroup, #ivGroup, #indGroup').show();
            $('#missingGroup').hide();
        }
        // Populate #variables with all variables
        populateVariablesList(columns);
    }).trigger('change');      // Trigger the change event to set the initial state

    $('#draw').click(function() {
        console.log('Draw button clicked');  // This message will be logged when the #draw button is clicked
    
        let option = $('#plotOptions').val();
        let indItems = $('#ind li:not(.placeholder)');
        if (indItems.length !== 2) {
            alert('Please select exactly two index variables.');
            return;
        }
        let firstVar = indItems.first().text();
        let secondVar = indItems.last().text();
    
        // Check if the first variable is numeric
        let firstVarIsNumeric = isNumeric(data[0][firstVar]);
    
        let numericVar, categoricalVar;
        if (firstVarIsNumeric) {
            numericVar = firstVar;
            categoricalVar = secondVar;
        } else {
            numericVar = secondVar;
            categoricalVar = firstVar;
        }
    
        let missingVar = $('#missing li:not(.placeholder)').first().text();
    
        if (option === 'missing') {
            drawMissingMatrix(numericVar, categoricalVar, missingVar, data);
        } else if (option === 'treatment') {
            let treatmentVar = $('#treatgroup').text();
            console.log(treatmentVar);
            drawTreatmentMatrix(numericVar, categoricalVar, treatmentVar, data);
        }
    });
    
    function isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };

    function drawMissingMatrix(numericVar, categoricalVar, missingVar, data) {
        // set the dimensions and margins of the graph
        var margin = {top: 30, right: 30, bottom: 30, left: 30},
        width = 500 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;
    
        // append the svg object to the body of the page
        var svg = d3.select("#content")
        .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");
    
        // Turn missingVar into a dummy variable
        data.forEach(d => {
            d[missingVar] = d[missingVar] ? 1 : 0;
        });
    
        const x_axis_labels = Array.from(new Set(data.map(d => d[numericVar])));
        const y_axis_labels = Array.from(new Set(data.map(d => d[categoricalVar])));
    
        // Build X scales and axis:
        const x = d3.scaleBand()
        .range([ 0, width ])
        .domain(x_axis_labels)
        .padding(0.01);
      
        // Build Y scales and axis:
        var y = d3.scaleBand()
        .range([ height, 0 ])
        .domain(y_axis_labels)
        .padding(0.01);
    
        // Calculate the size of a rectangle
        var rectSize = x.bandwidth();
    
        // Calculate the length of the longest label
        var maxLength = Math.max(...x_axis_labels.map(label => label.length), ...y_axis_labels.map(label => label.length));
    
        // Calculate font size based on rectangle size and label length
        var fontSize = rectSize / maxLength;
    
        svg.append("g")
        .style("font-size", fontSize + "px")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickSize(0))
        .selectAll("text")  
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)")
        .select(".domain").remove()
    
        svg.append("g")
        .style("font-size", fontSize + "px")
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll("text")  
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)")
        .select(".domain").remove()
    
        // Build color scale
        const myColor = d3.scaleOrdinal()
        .domain([0, 1])
        .range(["grey", "black"]);

    // create a tooltip
    const tooltip = d3.select("#content")
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")

    // Three function that change the tooltip when user hover / move / leave a cell
    const mouseover = function(event,d) {
        tooltip
            .style("opacity", 1)
        d3.select(this)
            .style("stroke", "black")
            .style("opacity", 1)
    }
    const mousemove = function(event,d) {
        tooltip
            .html("The exact value of<br>this cell is: " + (d[missingVar] ? "Exist" : "Missing"))
            .style("left", (event.x)/2 + "px")
            .style("top", (event.y)/2 + "px")
    }
    const mouseleave = function(event,d) {
        tooltip
            .style("opacity", 0)
        d3.select(this)
            .style("stroke", "none")
            .style("opacity", 0.8)
    }

    // add the squares
    svg.selectAll()
        .data(data, function(d) {return d[numericVar]+':'+d[categoricalVar];})
        .join("rect")
            .attr("x", function(d) { return x(d[numericVar]) })
            .attr("y", function(d) { return y(d[categoricalVar]) })
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("width", x.bandwidth() )
            .attr("height", y.bandwidth() )
            .style("fill", function(d) { return myColor(d[missingVar])} )
            .style("stroke-width", 4)
            .style("stroke", "none")
            .style("opacity", 0.8)
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave)
}    

function drawTreatmentMatrix(numericVar, categoricalVar, treatmentVar, data) {
    // set the dimensions and margins of the graph
    var margin = {top: 30, right: 30, bottom: 30, left: 30},
    width = 500 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

    console.log(treatmentVar)
    // append the svg object to the body of the page
    var svg = d3.select("#content")
    .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Check if treatmentVar is a dummy variable or missing
    data.forEach(d => {
        if (d[treatmentVar] === null || d[treatmentVar] === undefined || d[treatmentVar] === '') {
            d[treatmentVar] = 'missing';
        } else {
            let num = Number(d[treatmentVar]);
            if (Number.isNaN(num) || ![0, 1].includes(num)) {
                d[treatmentVar] = 'missing';
            } else {
                d[treatmentVar] = num;
            }
        }
    });

    console.log(data)

    const x_axis_labels = Array.from(new Set(data.map(d => d[numericVar])));
    const y_axis_labels = Array.from(new Set(data.map(d => d[categoricalVar])));

    // Build X scales and axis:
    const x = d3.scaleBand()
    .range([ 0, width ])
    .domain(x_axis_labels)
    .padding(0.01);
  
    // Build Y scales and axis:
    var y = d3.scaleBand()
    .range([ height, 0 ])
    .domain(y_axis_labels)
    .padding(0.01);

    // Calculate the size of a rectangle
    var rectSize = x.bandwidth();

    // Calculate the length of the longest label
    var maxLength = Math.max(...x_axis_labels.map(label => label.length), ...y_axis_labels.map(label => label.length));

    // Calculate font size based on rectangle size and label length
    var fontSize = rectSize / maxLength;

    svg.append("g")
    .style("font-size", fontSize + "px")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).tickSize(0))
    .selectAll("text")  
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-65)")
    .select(".domain").remove()

    svg.append("g")
    .style("font-size", fontSize + "px")
    .call(d3.axisLeft(y).tickSize(0))
    .selectAll("text")  
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-65)")
    .select(".domain").remove()

    // Build color scale
    const myColor = d3.scaleOrdinal()
    .domain([0, 1, 'missing'])
    .range(["#C8DEEC", "#2178AF", "grey"]);

        // create a tooltip
        const tooltip = d3.select("#content")
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")

    // Three function that change the tooltip when user hover / move / leave a cell
    const mouseover = function(event,d) {
        tooltip
            .style("opacity", 1)
        d3.select(this)
            .style("stroke", "black")
            .style("opacity", 1)
    }
    const mousemove = function(event,d) {
        let treatmentStatus;
        if (d[treatmentVar] === 0) {
            treatmentStatus = "Not treated";
        } else if (d[treatmentVar] === 1) {
            treatmentStatus = "Treated";
        } else {
            treatmentStatus = "Missing";
        }
        tooltip
            .html("The exact value of<br>this cell is: " + treatmentStatus)
            .style("left", (event.x)/2 + "px")
            .style("top", (event.y)/2 + "px")
    }
    const mouseleave = function(event,d) {
        tooltip
            .style("opacity", 0)
        d3.select(this)
            .style("stroke", "none")
            .style("opacity", 0.8)
    }
    // add the squares
    svg.selectAll()
    .data(data, function(d) {return d[numericVar]+':'+d[categoricalVar];})
    .join("rect")
        .attr("x", function(d) { return x(d[numericVar]) })
        .attr("y", function(d) { return y(d[categoricalVar]) })
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("width", x.bandwidth() )
        .attr("height", y.bandwidth() )
        .style("fill", function(d) { return myColor(d[treatmentVar])} )
        .style("stroke-width", 4)
        .style("stroke", "none")
        .style("opacity", 0.8)
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave)
}

});

// 重置所有变量和设置
function resetAll() {
    // 清空所有变量列表
    $('#variables, #dv, #iv, #ind, #missing').empty().append('<li class="placeholder"></li>');
    
    // 重置文件输入
    $('#dataFile').val('');
    
    // 重置选项
    $('#plotOptions').val('missing');
    
    // 清空结果区域
    $('#content').html(`
        <div style="text-align: center; padding: 50px; color: #666;">
            <i class="fa fa-info-circle" style="font-size: 48px; margin-bottom: 20px;"></i>
            <p style="font-size: 18px; font-family: 'retro1', sans-serif;">
                请上传数据文件并配置变量，然后点击“开始绘图”按钮
            </p>
            <p style="color: #999; font-size: 14px;">
                PanelView 支持缺失数据模式分析和因果推断可视化
            </p>
        </div>
    `);
    
    // 重置全局变量
    data = null;
    columns = null;
    
    console.log('所有设置已重置');
}