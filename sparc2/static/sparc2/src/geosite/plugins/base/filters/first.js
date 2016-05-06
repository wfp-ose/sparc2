geosite.filters["first"] = function()
{
    return function(array)
    {
        if (!Array.isArray(array))
        {
            return array;
        }
        return array[0];
    };
};
