import db from "../drizzle/db";
import { eq } from "drizzle-orm";
import { tickets } from "../drizzle/schema";
import { NewTicket, Ticket } from "../drizzle/schema";
import { TTicketUpdateSchema } from "./ticket.schema";

export const getTicketsService = async (): Promise<Ticket[]> => {
  return await db.query.tickets.findMany();
};

export const getTicketByIdService = async (
  ticketId: string
): Promise<Ticket | null> => {
  const result = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
  });
  return result || null;
};

export const createTicketService = async (
  ticketData: NewTicket
): Promise<Ticket> => {
  const result = await db.insert(tickets).values(ticketData).returning();
  return result[0];
};

export const updateTicketService = async (
  ticketId: string,
  ticketData: Partial<TTicketUpdateSchema>
): Promise<Ticket | null> => {
  try {
    const result = await db
      .update(tickets)
      .set({
        ...ticketData,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticketId))
      .returning();

    return result[0] || null;
  } catch (error) {
    console.error("Database update error:", error);
    throw error;
  }
};

export const deleteTicketService = async (
  ticketId: string
): Promise<Ticket | null> => {
  const result = await db
    .delete(tickets)
    .where(eq(tickets.id, ticketId))
    .returning();

  return result[0] || null;
};