/* *
 *
 *  (c) 2010-2019 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 *  Highcharts feature to make the Y axis stay fixed when scrolling the chart
 *  horizontally on mobile devices. Supports left and right side axes.
 */

/*
WIP on vertical scrollable plot area (#9378). To do:
- Bottom axis positioning
- Test with Gantt
- Look for size optimizing the code
- API and demos
 */

'use strict';

import H from './Globals.js';

/**
 * Internal types
 * @private
 */
declare global {
    namespace Highcharts {
        interface Chart {
            fixedDiv?: HTMLDOMElement;
            fixedRenderer?: Renderer;
            innerContainer?: HTMLDOMElement;
            scrollingContainer?: HTMLDOMElement;
            scrollableMask?: SVGElement;
            applyFixed(): void;
            moveFixedElements(): void;
            setUpScrolling(): void;
        }
    }
}


var addEvent = H.addEvent,
    Chart = H.Chart;

/**
 * Options for a scrollable plot area. This feature provides a minimum size for
 * the plot area of the chart. If the size gets smaller than this, typically
 * on mobile devices, a native browser scrollbar is presented. This scrollbar
 * provides smooth scrolling for the contents of the plot area, whereas the
 * title, legend and unaffected axes are fixed.
 *
 * Since v7.1.2, a scrollable plot area can be defined for either horizontal or
 * vertical scrolling, depending on whether the `minWidth` or `minHeight`
 * option is set.
 *
 * @sample highcharts/chart/scrollable-plotarea
 *         Scrollable plot area
 * @sample highcharts/chart/scrollable-plotarea-vertical
 *         Vertically scrollable plot area
 * @sample {gantt} highcharts/chart/scrollable-plotarea-vertical
 *         Gantt chart with vertically scrollable plot area
 *
 * @since     6.1.0
 * @product   highcharts gantt
 * @apioption chart.scrollablePlotArea
 */

/**
 * The minimum height for the plot area. If it gets smaller than this, the plot
 * area will become scrollable.
 *
 * @type      {number}
 * @apioption chart.scrollablePlotArea.minHeight
 */

/**
 * The minimum width for the plot area. If it gets smaller than this, the plot
 * area will become scrollable.
 *
 * @type      {number}
 * @apioption chart.scrollablePlotArea.minWidth
 */

/**
 * The initial scrolling position of the scrollable plot area. Ranges from 0 to
 * 1, where 0 aligns the plot area to the left and 1 aligns it to the right.
 * Typically we would use 1 if the chart has right aligned Y axes.
 *
 * @type      {number}
 * @apioption chart.scrollablePlotArea.scrollPositionX
 */

/**
 * The initial scrolling position of the scrollable plot area. Ranges from 0 to
 * 1, where 0 aligns the plot area to the top and 1 aligns it to the bottom.
 *
 * @type      {number}
 * @apioption chart.scrollablePlotArea.scrollPositionY
 */

/**
 * The opacity of mask applied on one of the sides of the plot
 * area.
 *
 * @sample {highcharts} highcharts/chart/scrollable-plotarea-opacity
 *         Disabled opacity for the mask
 *
 * @type        {number}
 * @default     0.85
 * @since       7.1.1
 * @apioption   chart.scrollablePlotArea.opacity
 */

''; // detach API doclets

/* eslint-disable no-invalid-this, valid-jsdoc */

addEvent(Chart as any, 'afterSetChartSize', function (
    this: Highcharts.Chart,
    e: { skipAxes: boolean }
): void {

    var scrollablePlotArea = (this.options.chart as any).scrollablePlotArea,
        scrollableMinWidth =
            scrollablePlotArea && scrollablePlotArea.minWidth,
        scrollableMinHeight =
            scrollablePlotArea && scrollablePlotArea.minHeight,
        scrollablePixelsX,
        scrollablePixelsY,
        corrections: (
            Highcharts.Dictionary<Highcharts.Dictionary<(number|string)>>|
            undefined
        );

    if (!this.renderer.forExport) {

        // The amount of pixels to scroll, the difference between chart
        // width and scrollable width
        if (scrollableMinWidth) {
            this.scrollablePixelsX = scrollablePixelsX = Math.max(
                0,
                scrollableMinWidth - this.chartWidth
            );
            if (scrollablePixelsX) {
                this.plotWidth += scrollablePixelsX;
                if (this.inverted) {
                    (this.clipBox as any).height += scrollablePixelsX;
                    this.plotBox.height += scrollablePixelsX;
                } else {
                    (this.clipBox as any).width += scrollablePixelsX;
                    this.plotBox.width += scrollablePixelsX;
                }

                corrections = {
                    // Corrections for right side
                    1: { name: 'right', value: scrollablePixelsX }
                };
            }

        // Currently we can only do either X or Y
        } else if (scrollableMinHeight) {
            this.scrollablePixelsY = scrollablePixelsY = Math.max(
                0,
                scrollableMinHeight - this.chartHeight
            );
            if (scrollablePixelsY) {
                this.plotHeight += scrollablePixelsY;
                if (this.inverted) {
                    (this.clipBox as any).width += scrollablePixelsY;
                    this.plotBox.width += scrollablePixelsY;
                } else {
                    (this.clipBox as any).height += scrollablePixelsY;
                    this.plotBox.height += scrollablePixelsY;
                }
                corrections = {
                    2: { name: 'bottom', value: scrollablePixelsY }
                };
            }
        }

        if (corrections && !e.skipAxes) {
            this.axes.forEach(function (axis: Highcharts.Axis): void {
                // For right and bottom axes, only fix the plot line length
                if ((corrections as any)[axis.side]) {
                    // Get the plot lines right in getPlotLinePath,
                    // temporarily set it to the adjusted plot width.
                    axis.getPlotLinePath = function (
                        this: Highcharts.Axis
                    ): Highcharts.SVGPathArray {
                        var marginName = (corrections as any)[axis.side].name,
                            correctionValue =
                                (corrections as any)[axis.side].value,
                            // axis.right or axis.bottom
                            margin = (this as any)[marginName],
                            path: Highcharts.SVGPathArray;

                        // Temporarily adjust
                        (this as any)[marginName] = margin - correctionValue;
                        path = H.Axis.prototype.getPlotLinePath.apply(
                            this,
                            arguments as any
                        ) as any;
                        // Reset
                        (this as any)[marginName] = margin;
                        return path;
                    };

                } else {
                    // Apply the corrected plotWidth
                    axis.setAxisSize();
                    axis.setAxisTranslation();
                }
            });
        }
    }
});

addEvent(Chart as any, 'render', function (this: Highcharts.Chart): void {
    if (this.scrollablePixelsX || this.scrollablePixelsY) {
        if (this.setUpScrolling) {
            this.setUpScrolling();
        }
        this.applyFixed();

    } else if (this.fixedDiv) { // Has been in scrollable mode
        this.applyFixed();
    }
});

/**
 * @private
 * @function Highcharts.Chart#setUpScrolling
 * @return {void}
 */
Chart.prototype.setUpScrolling = function (this: Highcharts.Chart): void {

    var attribs = {
        WebkitOverflowScrolling: 'touch',
        overflowX: 'hidden',
        overflowY: 'hidden'
    };

    if (this.scrollablePixelsX) {
        attribs.overflowX = 'auto';
    }
    if (this.scrollablePixelsY) {
        attribs.overflowY = 'auto';
    }

    // Add the necessary divs to provide scrolling
    this.scrollingContainer = H.createElement('div', {
        'className': 'highcharts-scrolling'
    }, attribs, this.renderTo);

    this.innerContainer = H.createElement('div', {
        'className': 'highcharts-inner-container'
    }, null as any, this.scrollingContainer);

    // Now move the container inside
    this.innerContainer.appendChild(this.container);

    // Don't run again
    this.setUpScrolling = null as any;
};

/**
 * These elements are moved over to the fixed renderer and stay fixed when the
 * user scrolls the chart
 * @private
 */
Chart.prototype.moveFixedElements = function (this: Highcharts.Chart): void {
    var container = this.container,
        fixedRenderer = this.fixedRenderer,
        fixedSelectors = [
            '.highcharts-contextbutton',
            '.highcharts-credits',
            '.highcharts-legend',
            '.highcharts-reset-zoom',
            '.highcharts-subtitle',
            '.highcharts-title',
            '.highcharts-legend-checkbox'
        ],
        axisClass;

    if (this.scrollablePixelsX && !this.inverted) {
        axisClass = '.highcharts-yaxis';
    } else if (this.scrollablePixelsX && this.inverted) {
        axisClass = '.highcharts-xaxis';
    } else if (this.scrollablePixelsY && !this.inverted) {
        axisClass = '.highcharts-xaxis';
    } else if (this.scrollablePixelsY && this.inverted) {
        axisClass = '.highcharts-yaxis';
    }

    fixedSelectors.push(axisClass as any, axisClass + '-labels');

    fixedSelectors.forEach(function (className: string): void {
        [].forEach.call(
            container.querySelectorAll(className),
            function (
                elem: (Highcharts.HTMLDOMElement|Highcharts.SVGDOMElement)
            ): void {
                (
                    elem.namespaceURI === (fixedRenderer as any).SVG_NS ?
                        (fixedRenderer as any).box :
                        (fixedRenderer as any).box.parentNode
                ).appendChild(elem);
                elem.style.pointerEvents = 'auto';
            }
        );
    });
};

/**
 * @private
 * @function Highcharts.Chart#applyFixed
 * @return {void}
 */
Chart.prototype.applyFixed = function (this: Highcharts.Chart): void {
    var fixedRenderer,
        scrollableWidth,
        scrollableHeight,
        firstTime = !this.fixedDiv,
        scrollableOptions = (this.options.chart as any).scrollablePlotArea;

    // First render
    if (firstTime) {

        this.fixedDiv = H.createElement(
            'div',
            {
                className: 'highcharts-fixed'
            },
            {
                position: 'absolute',
                overflow: 'hidden',
                pointerEvents: 'none',
                zIndex: 2
            },
            null as any,
            true
        );
        this.renderTo.insertBefore(
            this.fixedDiv,
            this.renderTo.firstChild
        );
        this.renderTo.style.overflow = 'visible';

        this.fixedRenderer = fixedRenderer = new H.Renderer(
            this.fixedDiv,
            this.chartWidth,
            this.chartHeight
        );

        // Mask
        this.scrollableMask = fixedRenderer
            .path()
            .attr({
                fill: H.color(
                    (this.options.chart as any).backgroundColor || '#fff'
                ).setOpacity(
                    H.pick(scrollableOptions.opacity, 0.85)
                ).get(),
                zIndex: -1
            } as Highcharts.SVGAttributes)
            .addClass('highcharts-scrollable-mask')
            .add();

        this.moveFixedElements();

        addEvent(this, 'afterShowResetZoom', this.moveFixedElements);

    } else {

        // Set the size of the fixed renderer to the visible width
        (this.fixedRenderer as any).setSize(
            this.chartWidth,
            this.chartHeight
        );
    }

    // Increase the size of the scrollable renderer and background
    scrollableWidth = this.chartWidth + (this.scrollablePixelsX || 0);
    scrollableHeight = this.chartHeight + (this.scrollablePixelsY || 0);
    H.stop(this.container as any);
    this.container.style.width = scrollableWidth + 'px';
    this.container.style.height = scrollableHeight + 'px';
    this.renderer.boxWrapper.attr({
        width: scrollableWidth,
        height: scrollableHeight,
        viewBox: [0, 0, scrollableWidth, scrollableHeight].join(' ')
    });
    (this.chartBackground as any).attr({
        width: scrollableWidth,
        height: scrollableHeight
    });

    if (this.scrollablePixelsY) {
        (this.scrollingContainer as any).style.height = this.chartHeight + 'px';
    }

    // Set scroll position
    if (firstTime) {

        if (scrollableOptions.scrollPositionX) {
            (this.scrollingContainer as any).scrollLeft =
                this.scrollablePixelsX * scrollableOptions.scrollPositionX;
        }
        if (scrollableOptions.scrollPositionY) {
            (this.scrollingContainer as any).scrollTop =
                this.scrollablePixelsY * scrollableOptions.scrollPositionY;
        }
    }

    // Mask behind the left and right side
    var axisOffset = this.axisOffset,
        maskTop = this.plotTop - axisOffset[0] - 1,
        maskLeft = this.plotLeft - axisOffset[3] - 1,
        maskBottom = this.plotTop + this.plotHeight + axisOffset[2] + 1,
        maskRight = this.plotLeft + this.plotWidth + axisOffset[1] + 1,
        maskPlotRight = this.plotLeft + this.plotWidth -
            (this.scrollablePixelsX || 0),
        maskPlotBottom = this.plotTop + this.plotHeight -
            (this.scrollablePixelsY || 0),
        d;


    if (this.scrollablePixelsX) {
        d = [
            // Left side
            'M', 0, maskTop,
            'L', this.plotLeft - 1, maskTop,
            'L', this.plotLeft - 1, maskBottom,
            'L', 0, maskBottom,
            'Z',

            // Right side
            'M', maskPlotRight, maskTop,
            'L', this.chartWidth, maskTop,
            'L', this.chartWidth, maskBottom,
            'L', maskPlotRight, maskBottom,
            'Z'
        ];
    } else if (this.scrollablePixelsY) {
        d = [
            // Top side
            'M', maskLeft, 0,
            'L', maskLeft, this.plotTop - 1,
            'L', maskRight, this.plotTop - 1,
            'L', maskRight, 0,
            'Z',

            // Bottom side
            'M', maskLeft, maskPlotBottom,
            'L', maskLeft, this.chartHeight,
            'L', maskRight, this.chartHeight,
            'L', maskRight, maskPlotBottom,
            'Z'
        ];
    } else {
        d = ['M', 0, 0];
    }

    if (this.redrawTrigger !== 'adjustHeight') {
        (this.scrollableMask as any).attr({
            d: d
        });
    }
};
