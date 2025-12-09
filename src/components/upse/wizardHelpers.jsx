/**
 * Helper functions for Structure Wizard
 */

/**
 * Add a new item to a list
 */
export function addItem(wizardData, type, template) {
  return {
    ...wizardData,
    [type]: [...wizardData[type], template]
  };
}

/**
 * Remove an item from a list
 */
export function removeItem(wizardData, type, index) {
  return {
    ...wizardData,
    [type]: wizardData[type].filter((_, i) => i !== index)
  };
}

/**
 * Update an item in a list
 */
export function updateItem(wizardData, type, index, field, value) {
  return {
    ...wizardData,
    [type]: wizardData[type].map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    )
  };
}

/**
 * Add a field to an entity
 */
export function addFieldToEntity(wizardData, entityIndex) {
  return {
    ...wizardData,
    entities: wizardData.entities.map((entity, i) => 
      i === entityIndex 
        ? { ...entity, fields: [...entity.fields, { name: "", type: "string" }] }
        : entity
    )
  };
}

/**
 * Update an entity field
 */
export function updateEntityField(wizardData, entityIndex, fieldIndex, key, value) {
  return {
    ...wizardData,
    entities: wizardData.entities.map((entity, i) => 
      i === entityIndex 
        ? {
            ...entity,
            fields: entity.fields.map((field, fi) =>
              fi === fieldIndex ? { ...field, [key]: value } : field
            )
          }
        : entity
    )
  };
}

/**
 * Remove an entity field
 */
export function removeEntityField(wizardData, entityIndex, fieldIndex) {
  return {
    ...wizardData,
    entities: wizardData.entities.map((entity, i) => 
      i === entityIndex 
        ? { ...entity, fields: entity.fields.filter((_, fi) => fi !== fieldIndex) }
        : entity
    )
  };
}