// utils/permissions.js
export function getPermission(sectionName) {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return 'hide'; // No user data, hide section

    const user = JSON.parse(userStr);

    // If no role assigned or no uiPermissions, treat as no access
    if (!user.allCustomerRole || !user.allCustomerRole.uiPermissions) {
      return 'hide';
    }

    const uiPermissions = user.allCustomerRole.uiPermissions;

    // If no permission defined for the section, hide it
    if (!uiPermissions.hasOwnProperty(sectionName)) {
      return 'hide';
    }

    // Return permission value ('full', 'view', 'hide')
    return uiPermissions[sectionName];

  } catch (err) {
    console.error('Error in getPermission:', err);
    return 'hide'; // On error, hide by default
  }
}


