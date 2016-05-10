geosite.filters["join"] = function()
{
    return function(array, arg)
    {
        if (Array.isArray(array))
        {
            return array.join(arg);
        }
        else
        {
            return array;
        }
    };
};
