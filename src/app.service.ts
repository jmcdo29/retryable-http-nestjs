import { Injectable, HttpService } from '@nestjs/common';
import { Observable, throwError, of } from 'rxjs';
import { catchError, retry, mergeMap } from 'rxjs/operators';

@Injectable()
export class AppService {
  constructor(private readonly httpService: HttpService) {}

  getGoogleBad(): Observable<any> {
    return this.httpService
      .get('http://localhost:3000/callback', { validateStatus: null })
      .pipe(
        mergeMap(val => {
          if (val.status >= 400) {
            return throwError(`${val.status} returned from http call`);
          }
          return of(val.data);
        }),
        retry(2),
        catchError(err => {
          return of(err);
        }),
      );
  }

  getHello(): string {
    return 'Hello World!';
  }
}
