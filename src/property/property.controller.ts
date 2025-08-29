import { Request, Response } from "express";
import {
  getPropertiesServices,
  getPropertyByIdServices,
  createPropertyServices,
  updatePropertyServices,
  deletePropertyServices,
  getPropertyManagersServices,
  assignPropertyManagerServices,
  removePropertyManagerServices,
} from "./property.service";
import { PartialPropertySchema, PropertyManagerSchema, PropertyQuerySchema, PropertySchema } from "./property.validator";

/**
 * Get all properties with optional filtering
 */
export const getProperties = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    // Validate query parameters
    const queryParams = PropertyQuerySchema.parse(req.query);
    
    console.log('Parsed query params:', queryParams);
    
    const result = await getPropertiesServices(queryParams);
    
    return res.status(200).json({
      success: true,
      data: result.properties,
      pagination: {
        page: queryParams.page,
        limit: queryParams.limit,
        total: result.total,
        pages: Math.ceil(result.total / queryParams.limit),
      },
    });
  } catch (error: any) {
    console.error('Error in getProperties:', error);
    
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        error: "Invalid query parameters",
        details: error.errors,
      });
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch properties",
    });
  }
};

/**
 * Get specific property details
 */
export const getPropertyById = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const propertyId = req.params.id;
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: "Property ID is required",
      });
    }

    const property = await getPropertyByIdServices(propertyId);
    
    if (!property) {
      return res.status(404).json({
        success: false,
        error: "Property not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: property,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch property",
    });
  }
};

/**
 * Create a new property
 */
export const createProperty = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    // Validate request body
    const validatedData = PropertySchema.parse(req.body);
    
    const newProperty = await createPropertyServices(validatedData);
    
    return res.status(201).json({
      success: true,
      message: "Property created successfully",
      data: newProperty,
    });
  } catch (error: any) {
    console.error('Error in createProperty:', error);
    
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        error: "Invalid property data",
        details: error.errors,
      });
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create property",
    });
  }
};

/**
 * Update property information
 */
export const updateProperty = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const propertyId = req.params.id;
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: "Property ID is required",
      });
    }

    // Validate request body
    const validatedData = PartialPropertySchema.parse(req.body);
    
    const updatedProperty = await updatePropertyServices(propertyId, validatedData);
    
    if (!updatedProperty) {
      return res.status(404).json({
        success: false,
        error: "Property not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Property updated successfully",
      data: updatedProperty,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        error: "Invalid property data",
        details: error.errors,
      });
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update property",
    });
  }
};

/**
 * Delete a property (soft delete)
 */
export const deleteProperty = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const propertyId = req.params.id;
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: "Property ID is required",
      });
    }

    const deletedProperty = await deletePropertyServices(propertyId);
    
    if (!deletedProperty) {
      return res.status(404).json({
        success: false,
        error: "Property not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Property deleted successfully",
      data: deletedProperty,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to delete property",
    });
  }
};

/**
 * List managers/users associated with a property
 */
export const getPropertyManagers = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const propertyId = req.params.id;
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: "Property ID is required",
      });
    }

    const managers = await getPropertyManagersServices(propertyId);
    
    return res.status(200).json({
      success: true,
      data: managers,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch property managers",
    });
  }
};

/**
 * Assign a manager to a property
 */
export const assignPropertyManager = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const propertyId = req.params.id;
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: "Property ID is required",
      });
    }

    // Validate request body
    const validatedData = PropertyManagerSchema.parse(req.body);
    
    const assignment = await assignPropertyManagerServices(propertyId, validatedData);
    
    return res.status(201).json({
      success: true,
      message: "Manager assigned successfully",
      data: assignment,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        error: "Invalid manager data",
        details: error.errors,
      });
    }
    
    if (error.message === "User not found" || error.message === "Property not found") {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    
    if (error.message === "Manager is already assigned to this property") {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to assign manager",
    });
  }
};

/**
 * Remove a manager from a property
 */
export const removePropertyManager = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const propertyId = req.params.id;
    const userId = req.params.userId;
    
    if (!propertyId || !userId) {
      return res.status(400).json({
        success: false,
        error: "Property ID and User ID are required",
      });
    }

    const result = await removePropertyManagerServices(propertyId, userId);
    
    return res.status(200).json({
      success: true,
      message: "Manager removed successfully",
      data: result,
    });
  } catch (error: any) {
    if (error.message === "Manager assignment not found") {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to remove manager",
    });
  }
};

// import { Request, Response } from "express";
// import {
//   getPropertiesServices,
//   getPropertyByIdServices,
//   createPropertyServices,
//   updatePropertyServices,
//   deletePropertyServices,
//   getPropertyManagersServices,
//   assignPropertyManagerServices,
//   removePropertyManagerServices,
// } from "./property.service";
// import { PartialPropertySchema, PropertyManagerSchema, PropertyQuerySchema, PropertySchema } from "./property.validator";

// /**
//  * Get all properties with optional filtering
//  */
// export const getProperties = async (
//   req: Request,
//   res: Response
// ): Promise<Response> => {
//   try {
//     // Validate query parameters
//     const queryParams = PropertyQuerySchema.parse(req.query);
    
//     console.log('Parsed query params:', queryParams); // Debug log
    
//     const result = await getPropertiesServices(queryParams);
    
//     return res.status(200).json({
//       success: true,
//       data: result.properties,
//       pagination: {
//         page: queryParams.page,
//         limit: queryParams.limit,
//         total: result.total,
//         pages: Math.ceil(result.total / queryParams.limit),
//       },
//     });
//   } catch (error: any) {
//     console.error('Error in getProperties:', error); // Debug log
    
//     if (error.name === "ZodError") {
//       return res.status(400).json({
//         success: false,
//         error: "Invalid query parameters",
//         details: error.errors,
//       });
//     }
    
//     return res.status(500).json({
//       success: false,
//       error: error.message || "Failed to fetch properties",
//     });
//   }
// };

// /**
//  * Get specific property details
//  */
// export const getPropertyById = async (
//   req: Request,
//   res: Response
// ): Promise<Response> => {
//   try {
//     const propertyId = req.params.id;
    
//     if (!propertyId) {
//       return res.status(400).json({
//         success: false,
//         error: "Property ID is required",
//       });
//     }

//     const property = await getPropertyByIdServices(propertyId);
    
//     if (!property) {
//       return res.status(404).json({
//         success: false,
//         error: "Property not found",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: property,
//     });
//   } catch (error: any) {
//     return res.status(500).json({
//       success: false,
//       error: error.message || "Failed to fetch property",
//     });
//   }
// };

// /**
//  * Create a new property
//  */
// export const createProperty = async (
//   req: Request,
//   res: Response
// ): Promise<Response> => {
//   try {
//     // Validate request body
//     const validatedData = PropertySchema.parse(req.body);
    
//     const newProperty = await createPropertyServices(validatedData);
    
//     return res.status(201).json({
//       success: true,
//       message: "Property created successfully",
//       data: newProperty,
//     });
//   } catch (error: any) {
//     if (error.name === "ZodError") {
//       return res.status(400).json({
//         success: false,
//         error: "Invalid property data",
//         details: error.errors,
//       });
//     }
    
//     return res.status(500).json({
//       success: false,
//       error: error.message || "Failed to create property",
//     });
//   }
// };

// /**
//  * Update property information
//  */
// export const updateProperty = async (
//   req: Request,
//   res: Response
// ): Promise<Response> => {
//   try {
//     const propertyId = req.params.id;
    
//     if (!propertyId) {
//       return res.status(400).json({
//         success: false,
//         error: "Property ID is required",
//       });
//     }

//     // Validate request body
//     const validatedData = PartialPropertySchema.parse(req.body);
    
//     const updatedProperty = await updatePropertyServices(propertyId, validatedData);
    
//     if (!updatedProperty) {
//       return res.status(404).json({
//         success: false,
//         error: "Property not found",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Property updated successfully",
//       data: updatedProperty,
//     });
//   } catch (error: any) {
//     if (error.name === "ZodError") {
//       return res.status(400).json({
//         success: false,
//         error: "Invalid property data",
//         details: error.errors,
//       });
//     }
    
//     return res.status(500).json({
//       success: false,
//       error: error.message || "Failed to update property",
//     });
//   }
// };

// /**
//  * Delete a property (soft delete)
//  */
// export const deleteProperty = async (
//   req: Request,
//   res: Response
// ): Promise<Response> => {
//   try {
//     const propertyId = req.params.id;
    
//     if (!propertyId) {
//       return res.status(400).json({
//         success: false,
//         error: "Property ID is required",
//       });
//     }

//     const deletedProperty = await deletePropertyServices(propertyId);
    
//     if (!deletedProperty) {
//       return res.status(404).json({
//         success: false,
//         error: "Property not found",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Property deleted successfully",
//       data: deletedProperty,
//     });
//   } catch (error: any) {
//     return res.status(500).json({
//       success: false,
//       error: error.message || "Failed to delete property",
//     });
//   }
// };

// /**
//  * List managers/users associated with a property
//  */
// export const getPropertyManagers = async (
//   req: Request,
//   res: Response
// ): Promise<Response> => {
//   try {
//     const propertyId = req.params.id;
    
//     if (!propertyId) {
//       return res.status(400).json({
//         success: false,
//         error: "Property ID is required",
//       });
//     }

//     const managers = await getPropertyManagersServices(propertyId);
    
//     return res.status(200).json({
//       success: true,
//       data: managers,
//     });
//   } catch (error: any) {
//     return res.status(500).json({
//       success: false,
//       error: error.message || "Failed to fetch property managers",
//     });
//   }
// };

// /**
//  * Assign a manager to a property
//  */
// export const assignPropertyManager = async (
//   req: Request,
//   res: Response
// ): Promise<Response> => {
//   try {
//     const propertyId = req.params.id;
    
//     if (!propertyId) {
//       return res.status(400).json({
//         success: false,
//         error: "Property ID is required",
//       });
//     }

//     // Validate request body
//     const validatedData = PropertyManagerSchema.parse(req.body);
    
//     const assignment = await assignPropertyManagerServices(propertyId, validatedData);
    
//     return res.status(201).json({
//       success: true,
//       message: "Manager assigned successfully",
//       data: assignment,
//     });
//   } catch (error: any) {
//     if (error.name === "ZodError") {
//       return res.status(400).json({
//         success: false,
//         error: "Invalid manager data",
//         details: error.errors,
//       });
//     }
    
//     if (error.message === "User not found" || error.message === "Property not found") {
//       return res.status(404).json({
//         success: false,
//         error: error.message,
//       });
//     }
    
//     if (error.message === "Manager is already assigned to this property") {
//       return res.status(409).json({
//         success: false,
//         error: error.message,
//       });
//     }
    
//     return res.status(500).json({
//       success: false,
//       error: error.message || "Failed to assign manager",
//     });
//   }
// };

// /**
//  * Remove a manager from a property
//  */
// export const removePropertyManager = async (
//   req: Request,
//   res: Response
// ): Promise<Response> => {
//   try {
//     const propertyId = req.params.id;
//     const userId = req.params.userId;
    
//     if (!propertyId || !userId) {
//       return res.status(400).json({
//         success: false,
//         error: "Property ID and User ID are required",
//       });
//     }

//     const result = await removePropertyManagerServices(propertyId, userId);
    
//     return res.status(200).json({
//       success: true,
//       message: "Manager removed successfully",
//       data: result,
//     });
//   } catch (error: any) {
//     if (error.message === "Manager assignment not found") {
//       return res.status(404).json({
//         success: false,
//         error: error.message,
//       });
//     }
    
//     return res.status(500).json({
//       success: false,
//       error: error.message || "Failed to remove manager",
//     });
//   }
// };