// Shape of the on-site rental application (see /apply/[unit])
export interface Occupant { name: string; dob: string; address: string; income: string; amount: string }

export interface Application {
  name: string; email: string; phone: string; occupants: Occupant[]; moveIn: string;
  attracted: string; whyMoving: string; consentComms: string; consentCredit: string;
  pets: string; references: string; insurance: string; parking: string; other: string;
}
