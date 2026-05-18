export const basicInfo = `
Basic chart component demonstrates how to create a chart at a specific location in app. LightningChart [components are positioned](https://lightningchart.com/js-charts/docs/more-guides/positioning-charts/) using HTML <div> elements and CSS.\n
[LC license key](https://lightningchart.com/js-charts/#license-key) is passed through LCContext (React) or when creating a chart.\n
[Destroying components](https://lightningchart.com/js-charts/docs/more-guides/dispose/)
`;

export const bubbleInfo = `
This example demonstrates how to load remote static data to chart.\n
[Mapping data to correct format](https://lightningchart.com/js-charts/docs/more-guides/optimizing-performance/#mapping-data-to-correct-format)\n
lineSeries.appendJSON(data, { whitelist: ['timestamp', 'value'] })
`;

export const multiStaticInfo = `
This example demonstrates how to load remote static data with timestamps to chart as JSON.\n
The X-axis needs to be zoomed in closer than around 1 day range, so the [high precision axis](https://lightningchart.com/js-charts/docs/features/axis/#zoom-ability) is enabled during chart creation with *defaultAxisX: { type: 'linear-highPrecision' }*.
`;

export const multiStaticBinaryInfo = `
This example demonstrates how to load remote static data with timestamps to chart as optimized binary [columnar data](https://lightningchart.com/js-charts/docs/more-guides/optimizing-performance/#columnar-data-formats) response.\n
The X-axis needs to be zoomed in closer than around 1 day range, so the [high precision axis](https://lightningchart.com/js-charts/docs/features/axis/#zoom-ability) is enabled during chart creation with *defaultAxisX: { type: 'linear-highPrecision' }*.
`;

export const syncedChartsInfo = `
This example demonstrates utilizing LC [DataSetXY](https://lightningchart.com/js-charts/docs/features/xy/line/#separating-data-sets-from-series) as centralized data storage.\n 
The synced charts and the [UI component](https://lightningchart.com/js-charts/docs/features/ui/) all use the same shared dataset.\n
Define the needed values for each series separately: chart.series.setDataSet(dataSet, { x: 'timestamp', y: 'temperature });.\n
The UI component calculates averages from the same data set by using dataSet.readBack() to get the data from the data set.
`;

export const axisSwitchingInfo = `
This example demonstrates [switching between axis type](https://lightningchart.com/js-charts/docs/features/xy/line/#switching-between-axis-types) (lin/log) during run time.\n
The axis type is switched using a shared data set, and updating the visible range of the axis to fit the data when switching to log axis.
`;

export const multiRealtimeInfo = `
This example demonstrates how to connect real-time JSON data stream to chart using [WebSocket](https://lightningchart.com/js-charts/docs/more-guides/real-time-data/websocket/).\n
In streaming use cases, memory usage can be limited by [configuring the maximum number of samples](https://lightningchart.com/js-charts/docs/features/xy/line/#data-cleaning--maximum-memory-use) that are retained.
`;

export const multiRealtimeBinaryInfo =  `
This example demonstrates how to connect real-time data stream to chart with binary columnar data using [WebSocket](https://lightningchart.com/js-charts/docs/more-guides/real-time-data/websocket/).\n
In streaming use cases, memory usage can be limited by [configuring the maximum number of samples](https://lightningchart.com/js-charts/docs/features/xy/line/#data-cleaning--maximum-memory-use) that are retained.\n
For more complicated data structures, LightningChart also has available a [data transfer library](https://lightningchart.com/js-charts/docs/more-guides/real-time-data/websocket/#data-transfer-library) dedicated to high performance data transfer between a server and application.
`;