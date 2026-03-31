local logger = require("logger")
local millennium = require("millennium")

local function on_load()
    logger:info("EUR Price Converter Lua backend loaded")
    millennium.ready()
end

local function on_frontend_loaded()
    logger:info("EUR Price Converter frontend loaded")
end

local function on_unload()
    logger:info("EUR Price Converter Lua backend unloaded")
end

return {
    on_load = on_load,
    on_frontend_loaded = on_frontend_loaded,
    on_unload = on_unload
}
