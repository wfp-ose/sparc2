c3.chart.internal.fn.getBarW = function(axis, barTargetsNum)
{
    var $$ = this;
    var config = $$.config;
    var w = undefined;
    if($.isNumeric(config.bar_width))
    {
      var v = config.bar_width;
      v = config.bar_width_max && v > config.bar_width_max ? config.bar_width_max : v;
      w = function(d, i){ return v;};
    }
    else if(c3.chart.internal.fn.isFunction(config.bar_width))
    {
      w = config.bar_width
    }
    else
    {
      var v = barTargetsNum ? (axis.tickInterval() * config.bar_width_ratio) / barTargetsNum : 0;
      v = config.bar_width_max && v > config.bar_width_max ? config.bar_width_max : v;
      w = function(d, i){ return v;};
    }
    return w;
};
c3.chart.internal.fn.getShapeX = function (offset, targetsNum, indices, isSub) {
    var $$ = this, scale = isSub ? $$.subX : $$.x;
    return function (d, i) {
        var index = d.id in indices ? indices[d.id] : 0;
        if(d.x || d.x === 0)
        {
          if(c3.chart.internal.fn.isFunction(offset))
          {
              return scale(d.x) - offset(d, i) * (targetsNum / 2 - index);
          }
          else
          {
            return scale(d.x) - offset * (targetsNum / 2 - index);
          }
        }
        else
        {
          return 0;
        }
    };
};
c3.chart.internal.fn.generateGetBarPoints = function (barIndices, isSub) {
    var $$ = this,
        axis = isSub ? $$.subXAxis : $$.xAxis,
        barTargetsNum = barIndices.__max__ + 1,
        barW = $$.getBarW(axis, barTargetsNum),
        barX = $$.getShapeX(barW, barTargetsNum, barIndices, !!isSub),
        barY = $$.getShapeY(!!isSub),
        barOffset = c3.chart.internal.fn.isFunction($$.config.bar_offset) ? $$.config.bar_offset : $$.getShapeOffset($$.isBarType, barIndices, !!isSub),
        yScale = isSub ? $$.getSubYScale : $$.getYScale;
    return function (d, i) {
        var y0 = yScale.call($$, d.id)(0),
            offset = barOffset(d, i) || y0, // offset is for stacked bar chart
            posX = barX(d, i), posY = barY(d);
        // fix posY not to overflow opposite quadrant
        if ($$.config.axis_rotated) {
            if ((0 < d.value && posY < y0) || (d.value < 0 && y0 < posY)) { posY = y0; }
        }
        // 4 points that make a bar
        return [
            [posX, offset],
            [posX, posY - (y0 - offset)],
            [posX + barW(d, i), posY - (y0 - offset)],
            [posX + barW(d, i), offset]
        ];
    };
};
c3.chart.internal.fn.getYDomainMax = function (targets) {
    var $$ = this, config = $$.config,
        ids = $$.mapToIds(targets), ys = $$.getValuesAsIdKeyed(targets),
        j, k, baseId, idsInGroup, id, hasPositiveValue;
    if (config.data_groups.length > 0 && ! config.bar_bullet ) {
        hasPositiveValue = $$.hasPositiveValueInTargets(targets);
        for (j = 0; j < config.data_groups.length; j++) {
            // Determine baseId
            idsInGroup = config.data_groups[j].filter(function (id) { return ids.indexOf(id) >= 0; });
            if (idsInGroup.length === 0) { continue; }
            baseId = idsInGroup[0];
            // Consider positive values
            if (hasPositiveValue && ys[baseId]) {
                ys[baseId].forEach(function (v, i) {
                    ys[baseId][i] = v > 0 ? v : 0;
                });
            }
            // Compute max
            for (k = 1; k < idsInGroup.length; k++) {
                id = idsInGroup[k];
                if (! ys[id]) { continue; }
                ys[id].forEach(function (v, i) {
                    if ($$.axis.getId(id) === $$.axis.getId(baseId) && ys[baseId] && !(hasPositiveValue && +v < 0)) {
                        ys[baseId][i] += +v;
                    }
                });
            }
        }
    }
    return $$.d3.max(Object.keys(ys).map(function (key) { return $$.d3.max(ys[key]); }));
};
