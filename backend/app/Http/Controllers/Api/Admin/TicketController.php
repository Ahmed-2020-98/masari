<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\TicketStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\TicketResource;
use App\Models\Ticket;
use App\Services\MerchantNotifier;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Enum;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TicketController extends Controller
{
    /**
     * All tickets.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return TicketResource::collection(
            Ticket::query()->with(['merchant', 'assignee', 'shipment'])
                ->when($request->query('status'), fn ($query, $status) => $query->where('status', $status))
                ->when($request->query('category'), fn ($query, $category) => $query->where('category', $category))
                ->when($request->query('mine'), fn ($query) => $query->where('assigned_to', $request->user()->id))
                ->when($request->query('search'), fn ($query, $term) => $query->where(fn ($inner) => $inner->where('number', 'like', "%{$term}%")->orWhere('subject', 'like', "%{$term}%")))
                ->orderByRaw("FIELD(status, 'open', 'pending', 'answered', 'closed')")
                ->latest('last_reply_at')
                ->paginate(25)
        );
    }

    /**
     * Ticket conversation.
     */
    public function show(Ticket $ticket): TicketResource
    {
        return TicketResource::make($ticket->load(['messages.user', 'merchant', 'assignee', 'shipment']));
    }

    /**
     * Staff reply; notifies the merchant.
     */
    public function reply(Request $request, Ticket $ticket, MerchantNotifier $notifier): TicketResource
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
            'attachments' => ['nullable', 'array', 'max:5'],
            'attachments.*' => ['file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $ticket->messages()->create([
            'user_id' => $request->user()->id,
            'is_staff' => true,
            'body' => $data['body'],
            'attachments' => collect($request->file('attachments', []))->map(fn (UploadedFile $file) => [
                'name' => $file->getClientOriginalName(),
                'path' => basename($file->store("tickets/{$ticket->id}", 'local')),
            ])->values()->all(),
        ]);

        $ticket->update(['status' => TicketStatus::Answered, 'last_reply_at' => now(), 'assigned_to' => $ticket->assigned_to ?? $request->user()->id]);
        $notifier->notify($ticket->merchant, 'ticket.replied', 'رد جديد على التذكرة '.$ticket->number, str($data['body'])->limit(90)->toString(), ['ticket_id' => $ticket->id], 'blue');

        return TicketResource::make($ticket->load(['messages.user', 'merchant', 'assignee', 'shipment']));
    }

    /**
     * Change status, priority or assignee.
     */
    public function update(Request $request, Ticket $ticket): TicketResource
    {
        $data = $request->validate([
            'status' => ['sometimes', new Enum(TicketStatus::class)],
            'priority' => ['sometimes', 'in:low,normal,high,urgent'],
            'assigned_to' => ['sometimes', 'nullable', 'exists:users,id'],
        ]);

        $ticket->update($data);

        return TicketResource::make($ticket->load(['merchant', 'assignee', 'shipment']));
    }

    /**
     * Download a ticket attachment.
     */
    public function attachment(Ticket $ticket, string $file): StreamedResponse
    {
        $path = "tickets/{$ticket->id}/{$file}";
        abort_unless(Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->download($path);
    }
}
