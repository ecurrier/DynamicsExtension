(function (global) {
    "use strict";

    global.EMC = global.EMC || {};
    global.EMC.Extension = global.EMC.Extension || {};
    global.EMC.Extension.Security = (function () {
        const category = "Security";

        let currentUserDetails = {
            userId: null,
            userName: null,
            securityRoles: null,
        };

        let allSecurityRoles = [];
        let selectedUserId = null;

        let allBusinessUnits = [];
        let selectedBusinessUnitId = null;

        const $systemUserSelectSelector = "#security-user-selector";
        const $businessUnitSelectSelector = "#security-business-unit-select";
        const tableRowCheckboxComponent = '<input class="form-check-input security-role-checkbox" type="checkbox" value="" />';

        function executeOnLoad() {
            retrieveCurrentUserDetails();
            retrieveAllSecurityRoleDetails();
            retrieveBusinessUnits();

            attachHandlers();
        }

        function attachHandlers() {
            $("#security-content button[data-function-name]").click(function () {
                EMC.Extension.Global.executeChromeScript($(this).attr("data-function-name"), category);
            });

            $("#security-content button[data-extension-function-name]").click(function () {
                EMC.Extension.Security[$(this).attr("data-extension-function-name")]();
            });

            $("#security-user-search-input").on("keyup", function (e) {
                if (e.which !== EMC.Extension.Global.KeyCodes.Enter) {
                    return;
                }

                $(this).siblings("button").click();
            });

            $("#security-table-search").on("keyup", filterSecurityTable);

            $($systemUserSelectSelector).change(loadSelectedUserSecurity);
            $($businessUnitSelectSelector).change(loadSelectedBusinessUnit);

            $("#security-table-container table").on("change", ".security-role-checkbox", handleRowSelect);
        }

        function retrieveCurrentUserDetails() {
            EMC.Extension.Global.executeChromeScript("retrieveCurrentUserDetails", category, null, false);
        }

        function initializeCurrentUserDetails(data) {
            currentUserDetails = data;
        }

        function retrieveAllSecurityRoleDetails() {
            EMC.Extension.Global.executeChromeScript("retrieveAllSecurityRoleDetails", category, null, false);
        }

        function retrieveBusinessUnits() {
            EMC.Extension.Global.executeChromeScript("retrieveBusinessUnits", category, null, false);
        }

        function initializeSecurityRoleDetails(data) {
            allSecurityRoles = data;
        }

        function initializeBusinessUnits(businessUnits) {
            allBusinessUnits = businessUnits;

            $.each(businessUnits, function (index, businessUnit) {
                $($businessUnitSelectSelector).append(
                    $("<option>", {
                        value: businessUnit.businessunitid,
                        text: businessUnit.name,
                    })
                );
            });

            if (businessUnits.length !== 1) {
                return;
            }

            $(`${$businessUnitSelectSelector} option:last-child`).prop("selected", true);
            $(`${$businessUnitSelectSelector}`).prop("disabled", true);
            selectedBusinessUnitId = businessUnits[0].businessunitid;
            initializeTable(allSecurityRoles);
        }

        function retrieveSystemUsers() {
            const searchQuery = $("#security-user-search-input").val();
            const payload = {
                query: searchQuery,
            };

            EMC.Extension.Global.executeChromeScript("retrieveSystemUsers", category, payload);
        }

        function populateSystemUserSelect(systemUsers) {
            resetSystemUserSelect();
            refreshSecurityTable();

            $.each(systemUsers, function (index, systemUser) {
                $($systemUserSelectSelector).append(
                    $("<option>", {
                        value: systemUser.systemuserid,
                        text: systemUser.fullname,
                    })
                );
            });
        }

        function resetSystemUserSelect() {
            $(`${$systemUserSelectSelector} option:not(:first)`).remove();
            $(`${$systemUserSelectSelector} option:first`).prop("selected", true);
        }

        function loadCurrentUserSecurity() {
            selectedUserId = currentUserDetails.userId;

            populateSystemUserSelect([{ systemuserid: selectedUserId, fullname: currentUserDetails.userName }]);
            $(`${$systemUserSelectSelector} option:last`).prop("selected", true);

            loadUserSecurity(selectedUserId, selectedBusinessUnitId);
        }

        function loadSelectedUserSecurity() {
            selectedUserId = $($systemUserSelectSelector).val();
            if (!selectedUserId) {
                return;
            }

            loadUserSecurity(selectedUserId, selectedBusinessUnitId);
        }

        function loadUserSecurity(systemUserId, businessUnitId) {
            if (!systemUserId || !businessUnitId) {
                return;
            }

            EMC.Extension.Global.executeChromeScript("retrieveUserSecurityRoles", category, {
                systemuserid: systemUserId,
                businessunitid: businessUnitId,
            });
        }

        function setSecurityRolesData(securityRoles) {
            resetTable();
            resetList();
            selectAssignedRoles(securityRoles);
        }

        function refreshSecurityRolesData() {
            loadUserSecurity(selectedUserId, selectedBusinessUnitId);
        }

        function resetTable() {
            $("#security-table-container table tbody tr").removeClass("table-primary table-success table-danger");
            $("#security-table-container table tbody tr th input").prop("checked", false);
            $(`tr[data-attribute-assigned]`).removeAttr("data-attribute-assigned");
        }

        function resetList() {
            $(".current-security-role-list li").remove();
        }

        function selectAssignedRoles(securityRoles) {
            $.each(securityRoles, function (index, securityRole) {
                $(`tr[data-attribute-id="${securityRole.roleid}"]`).addClass("table-primary");
                $(`tr[data-attribute-id="${securityRole.roleid}"]`).find("th > .security-role-checkbox").prop("checked", true);
                $(`tr[data-attribute-id="${securityRole.roleid}"]`).attr("data-attribute-assigned", "true");

                $(".current-security-role-list").append(
                    `<li class="list-group-item security-role-list-item" data-attribute-id="${securityRole.roleid}">${securityRole.name}</li>`
                );
            });
        }

        function handleRowSelect() {
            if (!selectedUserId) {
                return;
            }

            const checked = $(this).is(":checked");
            const tableRow = $(this).parents("tr");
            const roleId = tableRow.attr("data-attribute-id");
            const roleName = tableRow.attr("data-attribute-name");
            const assignedRole = tableRow.attr("data-attribute-assigned") ? true : false;
            const roleListItem = $(`.security-role-list-item[data-attribute-id="${roleId}"]`);

            if (assignedRole) {
                tableRow.toggleClass("table-danger", !checked);
                roleListItem.toggleClass("list-group-item-danger", !checked);
            } else {
                tableRow.toggleClass("table-success", checked);

                if (checked) {
                    $(".current-security-role-list").append(
                        `<li class="list-group-item security-role-list-item list-group-item-success" data-attribute-id="${roleId}">${roleName}</li>`
                    );
                } else {
                    roleListItem.remove();
                }
            }
        }

        function filterSecurityTable() {
            const filterQuery = $(this).val().toLowerCase();
            $("#security-table-container tbody tr").filter(function () {
                $(this).toggle($(this).attr("data-attribute-name").toLowerCase().indexOf(filterQuery) > -1);
            });
        }

        function loadSelectedBusinessUnit() {
            selectedBusinessUnitId = $($businessUnitSelectSelector).val();

            refreshSecurityTable();
            loadSelectedUserSecurity();
        }

        function refreshSecurityTable() {
            resetSecurityTable();
            resetList();

            const filteredSecurityRoles = allSecurityRoles.filter((s) => s._businessunitid_value === selectedBusinessUnitId);
            initializeTable(filteredSecurityRoles);
        }

        function resetSecurityTable() {
            $("#security-table-container table tbody tr").remove();
        }

        function initializeTable(securityRoles) {
            if (!securityRoles) {
                return;
            }

            $.each(securityRoles, function (index, securityRole) {
                const html = `
                    <tr class="table-important" data-attribute-id="${securityRole.roleid}" data-attribute-name="${securityRole.name}">
                        <th scope="row" class="contains-component">${tableRowCheckboxComponent}</th>
                        <td>${securityRole.name}</td>
                    </tr>`;

                $("#security-table-container table tbody").append(html);
            });
        }

        async function applySecurityRoleChanges() {
            const $successItems = $(".security-role-list-item.list-group-item-success");
            const $dangerItems = $(".security-role-list-item.list-group-item-danger");

            const associateRoleIds = getRoleIds($successItems);
            const disassociateRoleIds = getRoleIds($dangerItems);

            const payload = {
                systemUserId: selectedUserId,
                associateRoleIds: associateRoleIds,
                disassociateRoleIds: disassociateRoleIds,
            };

            const requireConfirmation = EMC.Extension.Settings.getExtensionSettings({ Parent: category, Group: "ApplyChanges", Key: "RequireConfirmation" });
            if (payload.disassociateRoleIds.length > 0 && requireConfirmation) {
                const confirm = await EMC.Extension.Global.confirmAction(
                    'You have selected to remove one or more security roles from the selected user.<br/><br/>Removing security roles may result in a loss of accessibility to certain system functionalities.<br/><br/><span class="fw-bold">Please confirm you would like to proceed with removing the selected security roles.</span>',
                    true
                );

                if (!confirm) {
                    return;
                }
            }

            EMC.Extension.Global.executeChromeScript("applySecurityRoleChanges", category, payload, true, "Applying Security Role Changes...");
        }

        function getRoleIds(selector) {
            return $(selector)
                .map(function () {
                    return $(this).attr("data-attribute-id");
                })
                .get();
        }

        return {
            executeOnLoad: executeOnLoad,
            initializeCurrentUserDetails: initializeCurrentUserDetails,
            initializeSecurityRoleDetails: initializeSecurityRoleDetails,
            initializeBusinessUnits: initializeBusinessUnits,
            retrieveSystemUsers: retrieveSystemUsers,
            populateSystemUserSelect: populateSystemUserSelect,
            loadCurrentUserSecurity: loadCurrentUserSecurity,
            setSecurityRolesData: setSecurityRolesData,
            applySecurityRoleChanges: applySecurityRoleChanges,
            refreshSecurityRolesData: refreshSecurityRolesData,
            filterSecurityTable: filterSecurityTable,
        };
    })();
})(this);
