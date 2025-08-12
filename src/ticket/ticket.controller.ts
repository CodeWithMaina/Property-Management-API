import { Request, Response } from "express";
import {
  getTicketsService,
  getTicketByIdService,
  createTicketService,
  updateTicketService,
  deleteTicketService,
} from "./ticket.service";
import { NewTicket } from "../drizzle/schema";
import { ticketUpdateSchema } from "./ticket.schema";

export const getTicketsController = async (req: Request, res: Response) => {
  try {
    const tickets = await getTicketsService();
    if (tickets == null || tickets.length === 0) {
      res.status(404).json({ message: "No tickets found" });
      return;
    }
    res.status(200).json(tickets);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch tickets",
      error: error.message,
    });
  }
};

export const getTicketByIdController = async (req: Request, res: Response) => {
  try {
    const ticketId = req.params.id;
    if (!ticketId) {
      res.status(400).json({ message: "Invalid ticket ID" });
      return;
    }

    const ticket = await getTicketByIdService(ticketId);
    if (!ticket) {
      res.status(404).json({ message: "Ticket not found" });
      return;
    }
    res.status(200).json(ticket);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch ticket",
      error: error.message,
    });
  }
};

export const createTicketController = async (req: Request, res: Response) => {
  try {
    const ticketData: NewTicket = req.body;
    if (!ticketData.createdById || !ticketData.title) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const newTicket = await createTicketService(ticketData);
    res.status(201).json(newTicket);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to create ticket",
      error: error.message,
    });
  }
};

export const updateTicketController = async (req: Request, res: Response) => {
  try {
    const ticketId = req.params.id;
    if (!ticketId) {
      res.status(400).json({ message: "Invalid ticket ID" });
      return;
    }

    const parsed = ticketUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const filteredData = parsed.data;
    const updatedTicket = await updateTicketService(ticketId, filteredData);
    
    if (!updatedTicket) {
      res.status(404).json({ message: "Ticket not found" });
      return;
    }

    res.status(200).json(updatedTicket);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to update ticket",
      error: error.message,
    });
  }
};

export const deleteTicketController = async (req: Request, res: Response) => {
  try {
    const ticketId = req.params.id;
    if (!ticketId) {
      res.status(400).json({ message: "Invalid ticket ID" });
      return;
    }

    const deletedTicket = await deleteTicketService(ticketId);
    if (!deletedTicket) {
      res.status(404).json({ message: "Ticket not found" });
      return;
    }
    res.status(200).json({ message: "Ticket deleted successfully" });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to delete ticket",
      error: error.message,
    });
  }
};