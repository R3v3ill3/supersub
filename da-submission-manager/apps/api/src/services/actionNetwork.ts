import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import pRetry, { Options as PRetryOptions } from 'p-retry';

export interface ActionNetworkConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface PersonPayload {
  given_name: string;
  family_name: string;
  email_addresses: { address: string; primary?: boolean; status?: 'subscribed' | 'unsubscribed' }[];
  postal_addresses?: {
    postal_code?: string;
    locality?: string;
    address_lines?: string[];
    region?: string;
    country?: string;
    primary?: boolean;
  }[];
  custom_fields?: Record<string, any>;
  tags?: string[];
  list_ids?: string[];
  group_ids?: string[];
}

export interface SubmissionPayload {
  personHref: string;
  actionHref: string;
  fields: Record<string, any>;
}

type RequestFn<T> = () => Promise<T>;

async function withRetry<T>(fn: RequestFn<T>, opts?: PRetryOptions) {
  return pRetry(fn, {
    retries: 3,
    minTimeout: 500,
    maxTimeout: 2000,
    ...opts,
  });
}

export class ActionNetworkClient {
  private client: AxiosInstance;

  constructor(config: ActionNetworkConfig) {
    const baseURL = config.baseUrl ?? 'https://actionnetwork.org/api/v2';

    this.client = axios.create({
      baseURL,
      headers: {
        'OSDI-API-Token': config.apiKey,
        'Content-Type': 'application/json',
        accept: 'application/hal+json',
      },
      timeout: 15000,
    });

    this.client.interceptors.response.use(undefined, (error) => {
      if (error.response) {
        const { status, data } = error.response;
        error.message = `Action Network request failed (${status}): ${JSON.stringify(data)}`;
      }
      return Promise.reject(error);
    });
  }

  private async post<T>(url: string, data: any, config?: AxiosRequestConfig) {
    return this.client.post<T>(url, data, config).then((res) => res.data);
  }

  private async get<T>(url: string, config?: AxiosRequestConfig) {
    return this.client.get<T>(url, config).then((res) => res.data);
  }

  async upsertPerson(payload: PersonPayload) {
    const body = {
      ...payload,
      email_addresses: payload.email_addresses.map((email, idx) => ({
        primary: idx === 0,
        status: email.status ?? 'subscribed',
        ...email,
      })),
      postal_addresses: payload.postal_addresses?.map((address, idx) => ({
        primary: idx === 0,
        ...address,
      })),
    };

    return withRetry(() => this.post('/people', body));
  }

  async recordSubmission(payload: SubmissionPayload) {
    const body = {
      _links: {
        'osdi:person': {
          href: payload.personHref,
        },
        'osdi:action': {
          href: payload.actionHref,
        },
      },
      ...payload.fields,
    };

    const submissionsUrl = `${payload.actionHref.replace(/\/$/, '')}/submissions`;
    return withRetry(() => this.post(submissionsUrl, body));
  }

  async addTags(personUrl: string, tags: string[]) {
    if (!tags.length) return;

    await Promise.all(
      tags.map((tag) =>
        withRetry(() =>
          this.post('/taggings', {
            _links: {
              'osdi:person': { href: personUrl },
              'osdi:tag': { href: tag },
            },
          })
        )
      )
    );
  }

  async addToLists(personUrl: string, listUrls: string[]) {
    if (!listUrls.length) return;

    await Promise.all(
      listUrls.map((list) =>
        withRetry(() =>
          this.post('/list_memberships', {
            _links: {
              'osdi:person': { href: personUrl },
              'osdi:list': { href: list },
            },
          })
        )
      )
    );
  }

  async addToGroups(personUrl: string, groupUrls: string[]) {
    if (!groupUrls.length) return;

    await Promise.all(
      groupUrls.map((group) =>
        withRetry(() =>
          this.post('/group_memberships', {
            _links: {
              'osdi:person': { href: personUrl },
              'osdi:group': { href: group },
            },
          })
        )
      )
    );
  }

  buildActionHref(actionUrl: string) {
    return actionUrl;
  }

  async listForms() {
    const data = await withRetry(() => this.get<any>('/forms'));
    return (data?._embedded?.['osdi:forms'] || []).map((form: any) => {
      const id = form.identifiers?.find((id: string) => id.startsWith('action_network:form_id:'))?.split(':').pop();
      return {
        id: id || null,
        name: form.name,
        browser_url: form.browser_url,
        action_url: form?._links?.self?.href,
      };
    });
  }

  async listLists() {
    const data = await withRetry(() => this.get<any>('/lists'));
    return (data?._embedded?.['osdi:lists'] || []).map((list: any) => {
      const id = list.identifiers?.find((id: string) => id.startsWith('action_network:list_id:'))?.split(':').pop();
      return {
        id: id || null,
        name: list.name,
        href: list?._links?.self?.href,
        description: list.description,
      };
    });
  }

  async listTags() {
    const data = await withRetry(() => this.get<any>('/tags'));
    return (data?._embedded?.['osdi:tags'] || []).map((tag: any) => {
      const id = tag.identifiers?.find((id: string) => id.startsWith('action_network:tag_id:'))?.split(':').pop();
      return {
        id: id || null,
        name: tag.name,
        href: tag?._links?.self?.href,
        description: tag.description,
      };
    });
  }

  async createTag(name: string, description?: string) {
    const payload = {
      name,
      description,
    };
    return withRetry(() => this.post('/tags', payload));
  }

  async listGroups() {
    const data = await withRetry(() => this.get<any>('/groups'));
    return (data?._embedded?.['osdi:groups'] || []).map((group: any) => {
      const id = group.identifiers?.find((id: string) => id.startsWith('action_network:group_id:'))?.split(':').pop();
      return {
        id: id || null,
        name: group.name,
        href: group?._links?.self?.href,
        description: group.description,
      };
    });
  }
}

