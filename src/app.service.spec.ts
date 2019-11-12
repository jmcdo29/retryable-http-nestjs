import { Test } from '@nestjs/testing';
import { AppService } from './app.service';
import { HttpService } from '@nestjs/common';
import { of, Observable, Subject, Observer } from 'rxjs';

const success = {
  status: 200,
  data: 'Some Data',
  config: {},
  statusText: '',
  headers: {},
};
const failure = {
  status: 400,
  data: 'Bad Request',
  config: {},
  statusText: '',
  headers: {},
};

const mockRetryFunction = (times: number, failureValue: any, successValue: any) => {
  let count = 0;
  return Observable.create((observer: Observer<any>) => {
    if (count++ < times) {
      observer.next(failureValue);
    } else {
      observer.next(successValue);
      observer.complete();
    }
  });
};

describe('AppService', () => {
  let service: AppService;
  let http: HttpService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get<AppService>(AppService);
    http = module.get(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('successful call', () => {
    it('should not retry the call at all', (done) => {
      const getSpy = jest.spyOn(http, 'get').mockReturnValue(
        mockRetryFunction(0, failure, success),
      );
      service.getGoogleBad().subscribe({
        next: val => {
          expect(val).toBe(success.data);
        },
        complete: () => {
          expect(getSpy).toBeCalledTimes(1);
          done();
        },
      });
    });
  });
  describe('unsuccessful call', () => {
    it('should retry the call two times and then succeed', (done) => {
      const getSpy = jest.spyOn(http, 'get');
      getSpy
        .mockReturnValue(mockRetryFunction(2, failure, success));
      service.getGoogleBad().subscribe({
        next: val => {
          expect(val).toBe(success.data);
        },
        complete: () => {
          expect(getSpy).toBeCalledTimes(1);
          done();
        },
      });
    });
    it('should fail too many times', (done) => {
      const getSpy = jest.spyOn(http, 'get');
      getSpy
        .mockReturnValue(mockRetryFunction(5, failure, success));
      service.getGoogleBad().subscribe({
        next: val => {
          expect(val).toBe(`${failure.status} returned from http call`);
        },
        complete: () => {
          expect(getSpy).toBeCalledTimes(1);
          done();
        },
      });
    });
  });
});
