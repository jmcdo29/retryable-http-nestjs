import { Injectable, HttpService } from '@nestjs/common';
import { Observable, empty, throwError, of } from 'rxjs';
import { catchError, retry, tap, mergeMap } from 'rxjs/operators';

@Injectable()
export class AppService {

  constructor(private readonly httpService: HttpService) {}

  getGoogleBad(): Observable<any> {
    let callsMade = 0;
    return this.httpService.get('https://www.google.com/item/character', {validateStatus: null}).pipe(
      tap(val => console.log(++callsMade)),
      mergeMap(val => {
        if (val.status >= 400) {
          return throwError(`${val.status} returned from http call`);
        }
        return of(val);
      }),
      retry(2),
      catchError(err => {
        console.error(err);
        return of(err);
      }),
    );
  }

  getHello(): string {
    return 'Hello World!';
  }
}
