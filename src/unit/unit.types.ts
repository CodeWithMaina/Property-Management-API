import { Amenity, Lease, LeaseStatusEnum, Organization, Property, PropertyManager, Unit, UnitAmenity, User } from "../drizzle/schema";

export type SimpleUser = Pick<User, 'id' | 'fullName' | 'email' | 'phone' | 'avatarUrl'>;
export type SimpleProperty = Pick<Property, 'id' | 'name' | 'organizationId'>;
export type SimpleOrganization = Pick<Organization, 'id' | 'name'>;
export type SimpleLease = Pick<Lease, 'id' | 'status' | 'startDate' | 'endDate' | 'rentAmount'>;
export type SimplePropertyManager = PropertyManager & { user: SimpleUser };

export interface UnitWithRelations extends Unit {
  property: SimpleProperty & {
    organization: SimpleOrganization;
    propertyManagers: SimplePropertyManager[];
  };
  unitAmenities: (UnitAmenity & {
    amenity: Pick<Amenity, 'id' | 'name' | 'description'>;
  })[];
  leases: (SimpleLease & {
    tenant: SimpleUser;
  })[];
}


export interface CurrentTenantInfo {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  leaseInfo: {
    id: string;
    status: LeaseStatusEnum;
    startDate: Date;
    endDate?: Date;
    rentAmount: string;
  };
}