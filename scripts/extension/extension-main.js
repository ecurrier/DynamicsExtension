$(document).ready(async function () {
    await EMC.Extension.Global.executeOnLoad();
    EMC.Extension.Utilities.executeOnLoad();
    EMC.Extension.Templates.executeOnLoad();
    EMC.Extension.WebAPI.executeOnLoad();
    EMC.Extension.Security.executeOnLoad();
});
